import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MercadoPagoPreferenceRequest {
  items: Array<{
    id: number,
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  external_reference: string;
  notification_url?: string;
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  external_reference: string;
}

export interface MercadoPagoPaymentInfo {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly baseUrl = 'https://api.mercadopago.com';

  constructor(private readonly configService: ConfigService) {
    this.accessToken =
      this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || '';
  }

  async createPreference(
    request: MercadoPagoPreferenceRequest,
  ): Promise<MercadoPagoPreferenceResponse> {
    const url = `${this.baseUrl}/checkout/preferences`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          ...request,
          items: request.items.map((item) => ({
            ...item,
            currency_id: item.currency_id || 'BRL',
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Mercado Pago API error: ${errorData}`);
        throw new Error(`Mercado Pago API error: ${response.status}`);
      }

      const data = await response.json();
      this.logger.log(`Preference created: ${data.id}`);

      return {
        id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        external_reference: data.external_reference,
      };
    } catch (error) {
      this.logger.error('Error creating Mercado Pago preference', error);
      throw error;
    }
  }

  async getPaymentInfo(paymentId: string): Promise<MercadoPagoPaymentInfo> {
    const url = `${this.baseUrl}/v1/payments/${paymentId}`;
    console.log('url',url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Mercado Pago API error: ${errorData}`);
        throw new Error(`Mercado Pago API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        status: data.status,
        status_detail: data.status_detail,
        external_reference: data.external_reference,
      };
    } catch (error) {
      this.logger.error('Error getting payment info from Mercado Pago', error);
      throw error;
    }
  }
}
