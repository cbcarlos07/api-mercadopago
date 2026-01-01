import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '../../domain/enums';

export class UpdatePaymentDto {
  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  description?: string;

  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: 'Status deve ser PENDING, PAID ou FAIL',
  })
  status?: PaymentStatus;
}
