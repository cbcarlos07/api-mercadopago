import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../../application/services';
import { PaymentMethod, PaymentStatus } from '../../domain/enums';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentResponseDto,
} from '../../application/dtos';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: jest.Mocked<PaymentService>;

  const mockPaymentResponse: PaymentResponseDto = {
    id: 1,
    cpf: '12345678901',
    description: 'Test Payment',
    amount: 100.0,
    paymentMethod: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    externalReference: 'ext-ref-123',
    initPoint: null,
    workflowId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPaymentService = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      handleMercadoPagoWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get(PaymentService);
  });

  describe('create', () => {
    it('should create a new payment', async () => {
      const createDto: CreatePaymentDto = {
        cpf: '12345678901',
        description: 'Test Payment',
        amount: 100.0,
        paymentMethod: PaymentMethod.PIX,
      };

      paymentService.create.mockResolvedValue(mockPaymentResponse);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockPaymentResponse);
      expect(paymentService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findById', () => {
    it('should return a payment by id', async () => {
      paymentService.findById.mockResolvedValue(mockPaymentResponse);

      const result = await controller.findById(mockPaymentResponse.id);

      expect(result).toEqual(mockPaymentResponse);
      expect(paymentService.findById).toHaveBeenCalledWith(
        mockPaymentResponse.id,
      );
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      paymentService.findAll.mockResolvedValue([mockPaymentResponse]);

      const result = await controller.findAll({});

      expect(result).toEqual([mockPaymentResponse]);
      expect(paymentService.findAll).toHaveBeenCalledWith({});
    });

    it('should filter payments by CPF', async () => {
      paymentService.findAll.mockResolvedValue([mockPaymentResponse]);

      const result = await controller.findAll({ cpf: '12345678901' });

      expect(result).toEqual([mockPaymentResponse]);
      expect(paymentService.findAll).toHaveBeenCalledWith({
        cpf: '12345678901',
      });
    });

    it('should filter payments by paymentMethod', async () => {
      paymentService.findAll.mockResolvedValue([mockPaymentResponse]);

      const result = await controller.findAll({
        paymentMethod: PaymentMethod.PIX,
      });

      expect(result).toEqual([mockPaymentResponse]);
      expect(paymentService.findAll).toHaveBeenCalledWith({
        paymentMethod: PaymentMethod.PIX,
      });
    });
  });

  describe('update', () => {
    it('should update a payment', async () => {
      const updateDto: UpdatePaymentDto = {
        status: PaymentStatus.PAID,
      };

      const updatedPayment = {
        ...mockPaymentResponse,
        status: PaymentStatus.PAID,
      };

      paymentService.update.mockResolvedValue(updatedPayment);

      const result = await controller.update(mockPaymentResponse.id, updateDto);

      expect(result).toEqual(updatedPayment);
      expect(paymentService.update).toHaveBeenCalledWith(
        mockPaymentResponse.id,
        updateDto,
      );
    });
  });

  describe('handleMercadoPagoWebhook', () => {
    it('should handle MercadoPago webhook', async () => {
      const webhookDto = {
        type: 'payment',
        data: { id: '12345' },
      };

      paymentService.handleMercadoPagoWebhook.mockResolvedValue(undefined);

      const result = await controller.handleMercadoPagoWebhook(webhookDto);

      expect(result).toEqual({ received: true });
      expect(paymentService.handleMercadoPagoWebhook).toHaveBeenCalledWith(
        'payment',
        '12345',
      );
    });

    it('should return received true even without data', async () => {
      const webhookDto = {};

      const result = await controller.handleMercadoPagoWebhook(webhookDto);

      expect(result).toEqual({ received: true });
      expect(paymentService.handleMercadoPagoWebhook).not.toHaveBeenCalled();
    });
  });
});
