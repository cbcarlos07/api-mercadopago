# Temporal.io - Orquestração de Pagamentos

Este módulo implementa a orquestração de pagamentos com cartão de crédito usando o Temporal.io.

## Estrutura do Módulo

```
src/temporal/
├── activities/
│   ├── payment.activities.ts    # Operações atômicas (DB, Mercado Pago)
│   └── index.ts
├── client/
│   ├── temporal.client.ts       # Cliente NestJS para Temporal
│   └── index.ts
├── config/
│   ├── temporal.config.ts       # Configurações do Temporal
│   └── index.ts
├── interfaces/
│   ├── payment-workflow.interface.ts  # Tipos e interfaces
│   └── index.ts
├── workflows/
│   ├── payment.workflow.ts      # Workflow de pagamento
│   └── index.ts
├── temporal.module.ts           # Módulo NestJS
├── worker.ts                    # Worker standalone
└── index.ts
```

## Fluxo do Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    creditCardPaymentWorkflow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Registrar pagamento com status PENDING                      │
│     └── Activity: updatePaymentStatus()                         │
│                                                                  │
│  2. Criar preferência no Mercado Pago                           │
│     └── Activity: createMercadoPagoPreference()                 │
│                                                                  │
│  3. Salvar ID do Mercado Pago no banco                          │
│     └── Activity: saveMercadoPagoId()                           │
│                                                                  │
│  4. Aguardar callback do Mercado Pago (Signal)                  │
│     ├── Signal recebido → Processar status                      │
│     └── Timeout (30min) → Fazer polling                         │
│                                                                  │
│  5. Atualizar status final (PAID/FAIL)                          │
│     └── Activity: updatePaymentStatus()                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Configuração

### 1. Iniciar o Temporal Server (Docker)

```bash
docker-compose -f docker-compose.temporal.yml up -d
```

### 2. Configurar variáveis de ambiente

```env
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=payment-task-queue
```

### 3. Iniciar o Worker

```bash
# Em um terminal separado
npm run temporal:worker
```

### 4. Iniciar a API

```bash
npm run start:dev
```

## Uso

### Criar pagamento com cartão de crédito

```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "12345678901",
    "description": "Compra online",
    "amount": 100.00,
    "paymentMethod": "CREDIT_CARD"
  }'
```

O sistema automaticamente:
1. Cria o pagamento no banco
2. Inicia o workflow no Temporal
3. Cria a preferência no Mercado Pago
4. Aguarda o callback via Signal

### Webhook do Mercado Pago

O endpoint `/api/payment/webhook/mercadopago` recebe os callbacks e sinaliza o workflow correspondente.

## Monitoramento

Acesse a UI do Temporal em: http://localhost:8080

Você pode visualizar:
- Workflows em execução
- Histórico de execuções
- Status das activities
- Logs e erros

## Resiliência

O Temporal garante:
- **Durabilidade**: Se o servidor cair, o workflow continua de onde parou
- **Retry automático**: Activities são automaticamente re-executadas em caso de falha
- **Timeout handling**: Workflows não ficam pendurados indefinidamente
- **Auditoria**: Todo o histórico é mantido para debugging

## Fallback

Se o Temporal não estiver disponível, o sistema automaticamente usa a integração direta com o Mercado Pago (sem orquestração).
