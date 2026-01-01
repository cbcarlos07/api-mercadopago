import { PaymentMethod, PaymentStatus } from '../../domain/enums';

export interface PaymentWorkflowInput {
  paymentId: number;
  cpf: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  externalReference: string;
}

export interface PaymentWorkflowResult {
  paymentId: number;
  status: PaymentStatus;
  mercadoPagoId?: string;
  errorMessage?: string;
}

export interface MercadoPagoCallbackSignal {
  mercadoPagoPaymentId: string;
  status: 'approved' | 'rejected' | 'cancelled' | 'pending';
}
