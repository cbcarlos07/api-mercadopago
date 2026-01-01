import { PaymentMethod, PaymentStatus } from '../../domain/enums';
import { Payment } from '../../domain/entities';

export class PaymentResponseDto {
  id: number;
  cpf: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  externalReference: string | null;
  initPoint: string | null;
  workflowId: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(payment: Payment): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.cpf = payment.cpf;
    dto.description = payment.description;
    dto.amount = Number(payment.amount);
    dto.paymentMethod = payment.paymentMethod;
    dto.status = payment.status;
    dto.externalReference = payment.externalReference;
    dto.initPoint = payment.initPoint;
    dto.workflowId = payment.workflowId;
    dto.createdAt = payment.createdAt;
    dto.updatedAt = payment.updatedAt;
    return dto;
  }
}
