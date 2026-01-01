import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class MercadoPagoWebhookDataDto {
  @IsOptional()
  @IsString()
  id?: string;
}
