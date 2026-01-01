import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentRepository } from '../../infrastructure/repositories';
import { MercadoPagoService } from '../../infrastructure/external';
import { PaymentMethod, PaymentStatus } from '../../domain/enums';
import { CreatePaymentDto, UpdatePaymentDto } from '../dtos';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let mercadoPagoService: jest.Mocked<MercadoPagoService>;

  const mockPayment = {
    id: 1,
    cpf: '12345678901',
    description: 'Test Payment',
    amount: 100.0,
    paymentMethod: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    externalReference: 'ext-ref-123',
    mercadoPagoId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const mockPaymentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      findByExternalReference: jest.fn(),
      findByMercadoPagoId: jest.fn(),
    };

    const mockMercadoPagoService = {
      createPreference: jest.fn(),
      getPaymentInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: mockPaymentRepository,
        },
        {
          provide: MercadoPagoService,
          useValue: mockMercadoPagoService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get(PaymentRepository);
    mercadoPagoService = module.get(MercadoPagoService);
  });

  describe('create', () => {
    it('should create a PIX payment with PENDING status', async () => {
      const createPaymentDto: CreatePaymentDto = {
        cpf: '12345678901',
        description: 'Test Payment',
        amount: 100.0,
        paymentMethod: PaymentMethod.PIX,
      };

      paymentRepository.create.mockResolvedValue(mockPayment as any);
      paymentRepository.findById.mockResolvedValue(mockPayment as any);

      const result = await service.create(createPaymentDto);

      expect(result).toBeDefined();
      expect(result.cpf).toBe(createPaymentDto.cpf);
      expect(result.paymentMethod).toBe(PaymentMethod.PIX);
      expect(paymentRepository.create).toHaveBeenCalled();
      expect(mercadoPagoService.createPreference).not.toHaveBeenCalled();
    });

    it('should create a CREDIT_CARD payment and call MercadoPago', async () => {
      const createPaymentDto: CreatePaymentDto = {
        cpf: '12345678901',
        description: 'Test Payment',
        amount: 100.0,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      };

      const creditCardPayment = {
        ...mockPayment,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        mercadoPagoId: 'mp-123',
      };

      paymentRepository.create.mockResolvedValue(creditCardPayment as any);
      paymentRepository.findById.mockResolvedValue(creditCardPayment as any);
      paymentRepository.update.mockResolvedValue(creditCardPayment as any);
      mercadoPagoService.createPreference.mockResolvedValue({
        id: 'mp-123',
        init_point: 'https://mercadopago.com/checkout',
        sandbox_init_point: 'https://sandbox.mercadopago.com/checkout',
        external_reference: 'ext-ref-123',
      });

      const result = await service.create(createPaymentDto);

      expect(result).toBeDefined();
      expect(result.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(mercadoPagoService.createPreference).toHaveBeenCalled();
    });

    it('should set FAIL status if MercadoPago integration fails', async () => {
      const createPaymentDto: CreatePaymentDto = {
        cpf: '12345678901',
        description: 'Test Payment',
        amount: 100.0,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      };

      paymentRepository.create.mockResolvedValue(mockPayment as any);
      paymentRepository.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAIL,
      } as any);
      mercadoPagoService.createPreference.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentRepository.update).toHaveBeenCalledWith(mockPayment.id, {
        status: PaymentStatus.FAIL,
      });
    });
  });

  describe('findById', () => {
    it('should return a payment by id', async () => {
      paymentRepository.findById.mockResolvedValue(mockPayment as any);

      const result = await service.findById(mockPayment.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockPayment.id);
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all payments without filters', async () => {
      paymentRepository.findAll.mockResolvedValue([mockPayment] as any);

      const result = await service.findAll({});

      expect(result).toHaveLength(1);
      expect(paymentRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should filter payments by CPF', async () => {
      paymentRepository.findAll.mockResolvedValue([mockPayment] as any);

      await service.findAll({ cpf: '12345678901' });

      expect(paymentRepository.findAll).toHaveBeenCalledWith({
        cpf: '12345678901',
      });
    });

    it('should filter payments by paymentMethod', async () => {
      paymentRepository.findAll.mockResolvedValue([mockPayment] as any);

      await service.findAll({ paymentMethod: PaymentMethod.PIX });

      expect(paymentRepository.findAll).toHaveBeenCalledWith({
        paymentMethod: PaymentMethod.PIX,
      });
    });
  });

  describe('update', () => {
    it('should update a payment', async () => {
      const updateDto: UpdatePaymentDto = {
        status: PaymentStatus.PAID,
      };

      const updatedPayment = { ...mockPayment, status: PaymentStatus.PAID };

      paymentRepository.findById.mockResolvedValue(mockPayment as any);
      paymentRepository.update.mockResolvedValue(updatedPayment as any);

      const result = await service.update(mockPayment.id, updateDto);

      expect(result.status).toBe(PaymentStatus.PAID);
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { status: PaymentStatus.PAID }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleMercadoPagoWebhook', () => {
    it('should update payment status to PAID on approved webhook', async () => {
      const paymentInfo = {
        id: 12345,
        status: 'approved',
        status_detail: 'accredited',
        external_reference: 'ext-ref-123',
      };

      mercadoPagoService.getPaymentInfo.mockResolvedValue(paymentInfo);
      paymentRepository.findByExternalReference.mockResolvedValue(
        mockPayment as any,
      );
      paymentRepository.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PAID,
      } as any);

      await service.handleMercadoPagoWebhook('payment', '12345');

      expect(paymentRepository.update).toHaveBeenCalledWith(mockPayment.id, {
        status: PaymentStatus.PAID,
      });
    });

    it('should update payment status to FAIL on rejected webhook', async () => {
      const paymentInfo = {
        id: 12345,
        status: 'rejected',
        status_detail: 'cc_rejected_other_reason',
        external_reference: 'ext-ref-123',
      };

      mercadoPagoService.getPaymentInfo.mockResolvedValue(paymentInfo);
      paymentRepository.findByExternalReference.mockResolvedValue(
        mockPayment as any,
      );
      paymentRepository.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAIL,
      } as any);

      await service.handleMercadoPagoWebhook('payment', '12345');

      expect(paymentRepository.update).toHaveBeenCalledWith(mockPayment.id, {
        status: PaymentStatus.FAIL,
      });
    });

    it('should ignore non-payment webhook types', async () => {
      await service.handleMercadoPagoWebhook('merchant_order', '12345');

      expect(mercadoPagoService.getPaymentInfo).not.toHaveBeenCalled();
    });
  });
});
