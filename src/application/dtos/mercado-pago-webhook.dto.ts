import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, ValidateNested, IsBoolean } from 'class-validator';
import { MercadoPagoWebhookDataDto } from './data.dto';

export class MercadoPagoWebhookDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  api_version?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data?: MercadoPagoWebhookDataDto;

  @IsOptional()
  @IsString()
  date_created?: string;

  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsBoolean()
  live_mode?: boolean;
}
