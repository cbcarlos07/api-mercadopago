import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentService } from '../../application/services';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  FilterPaymentDto,
  PaymentResponseDto,
  MercadoPagoWebhookDto,
} from '../../application/dtos';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.create(createPaymentDto);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.findById(id);
  }

  @Get()
  async findAll(
    @Query() filters: FilterPaymentDto,
  ): Promise<PaymentResponseDto[]> {
    return this.paymentService.findAll(filters);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Post('webhook/mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(
    @Body() webhookDto: MercadoPagoWebhookDto,
  ): Promise<{ received: boolean }> {
    
    if (webhookDto.type === 'payment' && webhookDto.data?.id) {
      await this.paymentService.handleMercadoPagoWebhook(
        webhookDto.type,
        webhookDto.data.id,
      );
    }
    return { received: true };
  }
}
