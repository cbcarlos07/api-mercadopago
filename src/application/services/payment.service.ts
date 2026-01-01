import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PaymentRepository } from '../../infrastructure/repositories';
import { MercadoPagoService } from '../../infrastructure/external';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  FilterPaymentDto,
  PaymentResponseDto,
} from '../dtos';
import { Payment } from '../../domain/entities';
import { PaymentMethod, PaymentStatus } from '../../domain/enums';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const externalReference = uuidv4();

    const paymentData: Partial<Payment> = {
      cpf: dto.cpf,
      description: dto.description,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      status: PaymentStatus.PENDING,
      externalReference,
    };

    const payment = await this.paymentRepository.create(paymentData);

    if (dto.paymentMethod === PaymentMethod.CREDIT_CARD) {
      try {
        const date = new Date();
        const _id = date.getTime();

        const preference = await this.mercadoPagoService.createPreference({
          items: [
            {
              id: _id,
              title: dto.description,
              quantity: 1,
              unit_price: dto.amount,
            },
          ],
          external_reference: externalReference,
        });

        await this.paymentRepository.update(payment.id, {
          mercadoPagoId: preference.id,
          initPoint: preference.init_point,
        });

        this.logger.log(
          `Credit card payment created with Mercado Pago preference: ${preference.id}`,
        );
      } catch (error) {
        this.logger.error('Error creating Mercado Pago preference', error);
        await this.paymentRepository.update(payment.id, {
          status: PaymentStatus.FAIL,
        });
        throw new BadRequestException(
          'Erro ao processar pagamento com cartão de crédito',
        );
      }
    }

    const updatedPayment = await this.paymentRepository.findById(payment.id);
    return PaymentResponseDto.fromEntity(updatedPayment!);
  }

  async findById(id: number): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(id);

    if (!payment) {
      throw new NotFoundException(`Pagamento com ID ${id} não encontrado`);
    }

    return PaymentResponseDto.fromEntity(payment);
  }

  async findAll(filters: FilterPaymentDto): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentRepository.findAll(filters);
    return payments.map((payment) => PaymentResponseDto.fromEntity(payment));
  }

  async update(id: number, dto: UpdatePaymentDto): Promise<PaymentResponseDto> {
    const existingPayment = await this.paymentRepository.findById(id);

    if (!existingPayment) {
      throw new NotFoundException(`Pagamento com ID ${id} não encontrado`);
    }

    const updatedPayment = await this.paymentRepository.update(id, dto);
    return PaymentResponseDto.fromEntity(updatedPayment!);
  }

  async handleMercadoPagoWebhook(
    type: string,
    paymentId: string,
  ): Promise<void> {
    if (type !== 'payment') {
      this.logger.log(`Ignoring webhook type: ${type}`);
      return;
    }

    try {
      const paymentInfo =
        await this.mercadoPagoService.getPaymentInfo(paymentId);

      const payment = await this.paymentRepository.findByExternalReference(
        paymentInfo.external_reference,
      );

      if (!payment) {
        this.logger.warn(
          `Payment not found for external reference: ${paymentInfo.external_reference}`,
        );
        return;
      }

      let newStatus: PaymentStatus;

      switch (paymentInfo.status) {
        case 'approved':
          newStatus = PaymentStatus.PAID;
          break;
        case 'rejected':
        case 'cancelled':
          newStatus = PaymentStatus.FAIL;
          break;
        default:
          newStatus = PaymentStatus.PENDING;
      }

      await this.paymentRepository.update(payment.id, { status: newStatus });

      this.logger.log(
        `Payment ${payment.id} updated to status ${newStatus} via webhook`,
      );
    } catch (error) {
      this.logger.error('Error processing Mercado Pago webhook', error);
      throw error;
    }
  }
}
