import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Payment } from '../domain/entities';
import { PaymentRepository } from '../infrastructure/repositories';
import { MercadoPagoService } from '../infrastructure/external';
import { PaymentService } from '../application/services';
import { PaymentController } from '../presentation/controllers';

@Module({
  imports: [SequelizeModule.forFeature([Payment])],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, MercadoPagoService],
  exports: [PaymentService],
})
export class PaymentModule {}
