import { NativeConnection, Worker } from '@temporalio/worker';
import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import { createPaymentActivities } from './activities';
import { TEMPORAL_CONFIG } from './config';
import { Payment } from '../domain/entities';
import { PaymentRepository } from '../infrastructure/repositories';
import { MercadoPagoService } from '../infrastructure/external';
import { PaymentStatus } from '@/domain/enums';

dotenv.config();

async function createDatabaseConnection(): Promise<Sequelize> {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'payment_db',
    logging: false,
    models: [Payment],
  });

  await sequelize.authenticate();
  console.log('[Worker] Database connection established');

  return sequelize;
}

function createMercadoPagoService() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  const baseUrl = 'https://api.mercadopago.com';

  return {
    async createPreference(request: {
      items: Array<{ title: string; quantity: number; unit_price: number }>;
      external_reference: string;
    }) {
      const response = await fetch(`${baseUrl}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...request,
          items: request.items.map((item) => ({
            ...item,
            currency_id: 'BRL',
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Mercado Pago API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
      };
    },

    async getPaymentInfo(paymentId: string) {
      const response = await fetch(`${baseUrl}/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Mercado Pago API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        status: data.status,
        external_reference: data.external_reference,
      };
    },
  };
}

async function run() {
  console.log('[Worker] Starting Temporal worker...');

  const sequelize = await createDatabaseConnection();

  const paymentRepository = {
    async update(id: number, data: { status: PaymentStatus; mercadoPagoId?: string }) {
      const payment = await Payment.findByPk(id);
      if (payment) {
        await payment.update(data);
      }
      return payment;
    },
    async findByExternalReference(ref: string) {
      return Payment.findOne({ where: { externalReference: ref } });
    },
  };

  const mercadoPagoService = createMercadoPagoService();

  const activities = createPaymentActivities({
    paymentRepository: paymentRepository as any,
    mercadoPagoService,
  });

  const connection = await NativeConnection.connect({
    address: TEMPORAL_CONFIG.address,
  });

  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_CONFIG.namespace,
    taskQueue: TEMPORAL_CONFIG.taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  console.log(`[Worker] Connected to Temporal at ${TEMPORAL_CONFIG.address}`);
  console.log(`[Worker] Listening on task queue: ${TEMPORAL_CONFIG.taskQueue}`);

  await worker.run();

  await sequelize.close();
}

run().catch((err) => {
  console.error('[Worker] Failed to start:', err);
  process.exit(1);
});
