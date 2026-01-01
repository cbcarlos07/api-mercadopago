import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class MercadoPagoWebhookDataDto {
  @IsOptional()
  @IsNumberString()
  id?: string;
}
