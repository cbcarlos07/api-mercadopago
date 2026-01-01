import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentRepository } from '../../infrastructure/repositories';
import { MercadoPagoService } from '../../infrastructure/external';
import { PaymentMethod, PaymentStatus } from '../../domain/enums';
import { CreatePaymentDto, UpdatePaymentDto } from '../dtos';
import { TemporalClientService } from '../../temporal';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let mercadoPagoService: jest.Mocked<MercadoPagoService>;
  let temporalClientService: jest.Mocked<TemporalClientService>;

  const mockPayment = {
    id: 1,
    cpf: '12345678901',
    description: 'Test Payment',
    amount: 100.0,
    paymentMethod: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    externalReference: 'ext-ref-123',
    mercadoPagoId: null,
    initPoint: null,
    workflowId: null,
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

    const mockTemporalClientService = {
      startCreditCardPaymentWorkflow: jest.fn(),
      getInitPoint: jest.fn(),
      signalMercadoPagoCallback: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
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
        {
          provide: TemporalClientService,
          useValue: mockTemporalClientService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get(PaymentRepository);
    mercadoPagoService = module.get(MercadoPagoService);
    temporalClientService = module.get(TemporalClientService);
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

    it('should create a CREDIT_CARD payment and start Temporal workflow', async () => {
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
        initPoint: 'https://mercadopago.com/checkout',
        workflowId: 'workflow-123',
      };

      paymentRepository.create.mockResolvedValue(creditCardPayment as any);
      paymentRepository.findById.mockResolvedValue(creditCardPayment as any);
      paymentRepository.update.mockResolvedValue(creditCardPayment as any);
      temporalClientService.startCreditCardPaymentWorkflow.mockResolvedValue({
        workflowId: 'workflow-123',
        runId: 'run-123',
      });
      temporalClientService.getInitPoint.mockResolvedValue('https://mercadopago.com/checkout');

      const result = await service.create(createPaymentDto);

      expect(result).toBeDefined();
      expect(result.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(temporalClientService.startCreditCardPaymentWorkflow).toHaveBeenCalled();
    });

    it('should set FAIL status if Temporal workflow fails', async () => {
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
      temporalClientService.startCreditCardPaymentWorkflow.mockRejectedValue(
        new Error('Temporal Error'),
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
    const mockPaymentWithWorkflow = {
      ...mockPayment,
      workflowId: 'workflow-123',
      mercadoPagoId: 'mp-123',
    };

    it('should update payment status to PAID on approved webhook', async () => {
      const paymentInfo = {
        id: 12345,
        status: 'approved',
        status_detail: 'accredited',
        external_reference: 'ext-ref-123',
      };

      mercadoPagoService.getPaymentInfo.mockResolvedValue(paymentInfo);
      paymentRepository.findByExternalReference.mockResolvedValue(
        mockPaymentWithWorkflow as any,
      );
      paymentRepository.update.mockResolvedValue({
        ...mockPaymentWithWorkflow,
        status: PaymentStatus.PAID,
      } as any);

      await service.handleMercadoPagoWebhook('payment', '12345');

      expect(paymentRepository.update).toHaveBeenCalledWith(mockPayment.id, {
        status: PaymentStatus.PAID,
      });
      expect(temporalClientService.signalMercadoPagoCallback).toHaveBeenCalledWith(
        'workflow-123',
        { mercadoPagoPaymentId: 'mp-123', status: 'approved' },
      );
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
        mockPaymentWithWorkflow as any,
      );
      paymentRepository.update.mockResolvedValue({
        ...mockPaymentWithWorkflow,
        status: PaymentStatus.FAIL,
      } as any);

      await service.handleMercadoPagoWebhook('payment', '12345');

      expect(paymentRepository.update).toHaveBeenCalledWith(mockPayment.id, {
        status: PaymentStatus.FAIL,
      });
      expect(temporalClientService.signalMercadoPagoCallback).toHaveBeenCalledWith(
        'workflow-123',
        { mercadoPagoPaymentId: 'mp-123', status: 'rejected' },
      );
    });

    it('should ignore non-payment webhook types', async () => {
      await service.handleMercadoPagoWebhook('merchant_order', '12345');

      expect(mercadoPagoService.getPaymentInfo).not.toHaveBeenCalled();
    });
  });
});
