import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Length,
  Matches,
} from 'class-validator';
import { PaymentMethod } from '../../domain/enums';

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @Length(11, 11, { message: 'CPF deve ter exatamente 11 dígitos' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas números' })
  cpf: string;

  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  description: string;

  @IsNotEmpty({ message: 'Valor é obrigatório' })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @IsNotEmpty({ message: 'Método de pagamento é obrigatório' })
  @IsEnum(PaymentMethod, {
    message: 'Método de pagamento deve ser PIX ou CREDIT_CARD',
  })
  paymentMethod: PaymentMethod;
}
