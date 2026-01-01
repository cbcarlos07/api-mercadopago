import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Payment } from '../../domain/entities';
import { FilterPaymentDto } from '../../application/dtos';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(Payment)
    private readonly paymentModel: typeof Payment,
  ) {}

  async create(data: Partial<Payment>): Promise<Payment> {
    return this.paymentModel.create(data as Payment);
  }

  async findById(id: number): Promise<Payment | null> {
    return this.paymentModel.findByPk(id);
  }

  async findAll(filters?: FilterPaymentDto): Promise<Payment[]> {
    const where: WhereOptions<Payment> = {};

    if (filters?.cpf) {
      where.cpf = filters.cpf;
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.paymentModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  }

  async update(id: number, data: Partial<Payment>): Promise<Payment | null> {
    const payment = await this.findById(id);

    if (!payment) {
      return null;
    }

    await payment.update(data);
    return payment;
  }

  async findByExternalReference(
    externalReference: string,
  ): Promise<Payment | null> {
    return this.paymentModel.findOne({
      where: { externalReference },
    });
  }

  async findByMercadoPagoId(mercadoPagoId: string): Promise<Payment | null> {
    return this.paymentModel.findOne({
      where: { mercadoPagoId },
    });
  }
}
