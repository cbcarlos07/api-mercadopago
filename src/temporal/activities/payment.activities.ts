import { PaymentStatus } from '../../domain/enums';

export interface CreatePreferenceInput {
  paymentId: number;
  description: string;
  amount: number;
  externalReference: string;
}

export interface PreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export interface PollStatusResult {
  paymentId: string;
  status: string;
}

export interface PaymentActivities {
  updatePaymentStatus(paymentId: number, status: PaymentStatus): Promise<void>;
  createMercadoPagoPreference(input: CreatePreferenceInput): Promise<PreferenceResult>;
  saveMercadoPagoId(paymentId: number, mercadoPagoId: string, initPoint: string): Promise<void>;
  pollMercadoPagoStatus(externalReference: string): Promise<PollStatusResult | null>;
}

export function createPaymentActivities(dependencies: {
  paymentRepository: {
    update: (id: number, data: { status?: PaymentStatus; mercadoPagoId?: string, initPoint?: string }) => Promise<unknown>;
    findByExternalReference: (ref: string) => Promise<{ id: number } | null>;
  };
  mercadoPagoService: {
    createPreference: (request: {
      items: Array<{ title: string; quantity: number; unit_price: number }>;
      external_reference: string;
    }) => Promise<{ id: string; init_point: string; sandbox_init_point: string }>;
    getPaymentInfo: (paymentId: string) => Promise<{ status: string; external_reference: string }>;
  };
}): PaymentActivities {
  const { paymentRepository, mercadoPagoService } = dependencies;

  return {
    async updatePaymentStatus(
      paymentId: number,
      status: PaymentStatus,
    ): Promise<void> {
      await paymentRepository.update(paymentId, { status });
      console.log(`[Activity] Payment ${paymentId} status updated to ${status}`);
    },

    async createMercadoPagoPreference(
      input: CreatePreferenceInput,
    ): Promise<PreferenceResult> {
      console.log(`[Activity] Creating Mercado Pago preference for payment ${input.paymentId}`);

      const response = await mercadoPagoService.createPreference({
        items: [
          {
            title: input.description,
            quantity: 1,
            unit_price: input.amount,
          },
        ],
        external_reference: input.externalReference,
      });

      console.log(`[Activity] Preference created: ${response.id}`);

      return {
        id: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
      };
    },

    async saveMercadoPagoId(
      paymentId: number,
      mercadoPagoId: string,
      initPoint: string
    ): Promise<void> {
      await paymentRepository.update(paymentId, { mercadoPagoId, initPoint });
      console.log(`[Activity] Saved Mercado Pago ID ${mercadoPagoId} and initPoint for payment ${paymentId}`);
    },

    async pollMercadoPagoStatus(
      externalReference: string,
    ): Promise<PollStatusResult | null> {
      console.log(`[Activity] Polling Mercado Pago status for reference ${externalReference}`);

      try {
        const payment = await paymentRepository.findByExternalReference(externalReference);

        if (!payment) {
          console.log(`[Activity] Payment not found for reference ${externalReference}`);
          return null;
        }

        return {
          paymentId: String(payment.id),
          status: 'pending',
        };
      } catch (error) {
        console.error(`[Activity] Error polling status: ${error}`);
        return null;
      }
    },
  };
}
