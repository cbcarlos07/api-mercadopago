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
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsBoolean()
  live_mode?: boolean;
}
