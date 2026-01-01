import { IsOptional, IsString, IsEnum, Matches, Length } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../domain/enums';

export class FilterPaymentDto {
  @IsOptional()
  @IsString({ message: 'CPF deve ser uma string' })
  @Length(11, 11, { message: 'CPF deve ter exatamente 11 dígitos' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas números' })
  cpf?: string;

  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'Método de pagamento deve ser PIX ou CREDIT_CARD',
  })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: 'Status deve ser PENDING, PAID ou FAIL',
  })
  status?: PaymentStatus;
}
