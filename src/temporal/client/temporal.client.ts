import { Client, Connection } from '@temporalio/client';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { creditCardPaymentWorkflow, mercadoPagoCallbackSignal } from '../workflows';
import { PaymentWorkflowInput, PaymentWorkflowResult, MercadoPagoCallbackSignal } from '../interfaces';
import { TEMPORAL_CONFIG } from '../config';

@Injectable()
export class TemporalClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalClientService.name);
  private client: Client | null = null;
  private connection: Connection | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      const address = this.configService.get<string>('TEMPORAL_ADDRESS') || TEMPORAL_CONFIG.address;

      this.connection = await Connection.connect({ address });
      this.client = new Client({
        connection: this.connection,
        namespace: TEMPORAL_CONFIG.namespace,
      });

      this.logger.log(`Connected to Temporal at ${address}`);
    } catch (error) {
      this.logger.warn(`Failed to connect to Temporal: ${error}. Workflow features will be disabled.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.logger.log('Temporal connection closed');
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  async startCreditCardPaymentWorkflow(
    input: PaymentWorkflowInput,
  ): Promise<{ workflowId: string; runId: string }> {
    if (!this.client) {
      throw new Error('Temporal client not connected');
    }

    const workflowId = `payment-${input.paymentId}-${uuidv4().slice(0, 8)}`;

    this.logger.log(`Starting workflow ${workflowId} for payment ${input.paymentId}`);

    const handle = await this.client.workflow.start(creditCardPaymentWorkflow, {
      taskQueue: TEMPORAL_CONFIG.taskQueue,
      workflowId,
      args: [input],
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  }

  async signalMercadoPagoCallback(
    workflowId: string,
    callback: MercadoPagoCallbackSignal,
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Temporal client not connected');
    }

    this.logger.log(`Signaling workflow ${workflowId} with callback status: ${callback.status}`);

    const handle = this.client.workflow.getHandle(workflowId);
    await handle.signal(mercadoPagoCallbackSignal, callback);
  }

  async getWorkflowResult(workflowId: string): Promise<PaymentWorkflowResult> {
    if (!this.client) {
      throw new Error('Temporal client not connected');
    }

    const handle = this.client.workflow.getHandle(workflowId);
    return await handle.result();
  }

  async findWorkflowByExternalReference(
    externalReference: string,
  ): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const workflows = this.client.workflow.list({
        query: `ExecutionStatus = "Running"`,
      });

      for await (const workflow of workflows) {
        if (workflow.workflowId.includes('payment-')) {
          return workflow.workflowId;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error finding workflow: ${error}`);
      return null;
    }
  }
}
