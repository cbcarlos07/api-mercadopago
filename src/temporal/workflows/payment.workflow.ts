import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
} from '@temporalio/workflow';
import type { PaymentActivities } from '../activities/payment.activities';
import {
  PaymentWorkflowInput,
  PaymentWorkflowResult,
  MercadoPagoCallbackSignal,
} from '../interfaces';
import { PaymentStatus } from '../../domain/enums';

const activities = proxyActivities<PaymentActivities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
  },
});

export const mercadoPagoCallbackSignal =
  defineSignal<[MercadoPagoCallbackSignal]>('mercadoPagoCallback');

export async function creditCardPaymentWorkflow(
  input: PaymentWorkflowInput,
): Promise<PaymentWorkflowResult> {
  let callbackReceived = false;
  let callbackData: MercadoPagoCallbackSignal | null = null;

  setHandler(mercadoPagoCallbackSignal, (data: MercadoPagoCallbackSignal) => {
    callbackReceived = true;
    callbackData = data;
  });

  try {
    await activities.updatePaymentStatus(input.paymentId, PaymentStatus.PENDING);

    const preference = await activities.createMercadoPagoPreference({
      paymentId: input.paymentId,
      description: input.description,
      amount: input.amount,
      externalReference: input.externalReference,
    });

    await activities.saveMercadoPagoId(input.paymentId, preference.id);

    const timeoutMs = 30 * 60 * 1000; // 30 minutos
    const received = await condition(() => callbackReceived, timeoutMs);

    if (!received) {
      const polledStatus = await activities.pollMercadoPagoStatus(
        input.externalReference,
      );

      if (polledStatus) {
        callbackData = {
          mercadoPagoPaymentId: polledStatus.paymentId,
          status: polledStatus.status as MercadoPagoCallbackSignal['status'],
        };
        callbackReceived = true;
      }
    }

    if (!callbackReceived || !callbackData) {
      await activities.updatePaymentStatus(input.paymentId, PaymentStatus.FAIL);

      return {
        paymentId: input.paymentId,
        status: PaymentStatus.FAIL,
        mercadoPagoId: preference.id,
        errorMessage: 'Timeout aguardando confirmação do pagamento',
      };
    }

    let finalStatus: PaymentStatus;

    switch (callbackData.status) {
      case 'approved':
        finalStatus = PaymentStatus.PAID;
        break;
      case 'rejected':
      case 'cancelled':
        finalStatus = PaymentStatus.FAIL;
        break;
      default:
        finalStatus = PaymentStatus.PENDING;
    }

    await activities.updatePaymentStatus(input.paymentId, finalStatus);

    return {
      paymentId: input.paymentId,
      status: finalStatus,
      mercadoPagoId: preference.id,
    };
  } catch (error) {
    await activities.updatePaymentStatus(input.paymentId, PaymentStatus.FAIL);

    return {
      paymentId: input.paymentId,
      status: PaymentStatus.FAIL,
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
