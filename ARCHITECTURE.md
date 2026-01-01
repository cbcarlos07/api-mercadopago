# Análise da Arquitetura do Projeto

## Visão Geral

- **Nome do Projeto**: payment-api
- **Framework**: NestJS (Node.js)
- **Tipo**: API REST para gerenciamento de pagamentos
- **Funcionalidades Principais**:
  - Processamento de pagamentos com integração Mercado Pago
  - Suporte para métodos de pagamento PIX e Cartão de Crédito
  - Orquestração de workflows assíncronos com Temporal.io
  - Banco de dados PostgreSQL com Sequelize ORM

---

## Arquitetura: Clean Architecture (Hexagonal)

O projeto segue os princípios da **Clean Architecture** com clara separação de responsabilidades.

### Camadas da Arquitetura

| Camada | Diretório | Responsabilidade |
|--------|-----------|------------------|
| **Presentation** | `src/presentation/` | Controllers HTTP, rotas e validação de parâmetros |
| **Application** | `src/application/` | Serviços de negócio, DTOs e orquestração |
| **Domain** | `src/domain/` | Entidades e enums (regras de negócio puras) |
| **Infrastructure** | `src/infrastructure/` | Repositórios e integrações externas |
| **Temporal** | `src/temporal/` | Workflows assíncronos e activities |

---

## Estrutura de Diretórios

```
src/
├── application/
│   ├── dtos/                         # Data Transfer Objects (validação)
│   │   ├── create-payment.dto.ts
│   │   ├── update-payment.dto.ts
│   │   ├── filter-payment.dto.ts
│   │   ├── payment-response.dto.ts
│   │   ├── mercado-pago-webhook.dto.ts
│   │   └── data.dto.ts
│   └── services/
│       └── payment.service.ts        # Lógica de negócio
├── domain/
│   ├── entities/
│   │   └── payment.entity.ts         # Entidade de domínio (Sequelize)
│   └── enums/
│       ├── payment-status.enum.ts    # PENDING, PAID, FAIL
│       └── payment-method.enum.ts    # PIX, CREDIT_CARD
├── infrastructure/
│   ├── repositories/
│   │   └── payment.repository.ts     # Abstração de acesso a dados
│   └── external/
│       └── mercado-pago.service.ts   # Integração com API externa
├── presentation/
│   └── controllers/
│       └── payment.controller.ts     # Endpoints HTTP
├── temporal/
│   ├── workflows/
│   │   └── payment.workflow.ts       # Definições de workflows
│   ├── activities/
│   │   └── payment.activities.ts     # Implementações de activities
│   ├── client/
│   │   └── temporal.client.ts        # Cliente Temporal
│   ├── config/
│   │   └── temporal.config.ts        # Configuração do Temporal
│   ├── interfaces/
│   │   └── payment-workflow.interface.ts
│   ├── temporal.module.ts
│   ├── worker.ts                     # Processo worker do Temporal
│   └── index.ts
├── modules/
│   └── payment.module.ts             # Módulo de funcionalidade
├── config/
│   └── database.config.ts            # Configuração do banco
├── app.module.ts                     # Módulo raiz
└── main.ts                           # Ponto de entrada
```

---

## Padrões de Design Utilizados

### Repository Pattern
- `PaymentRepository` abstrai o acesso ao banco de dados
- Métodos: `create()`, `findById()`, `findAll()`, `update()`, `findByExternalReference()`, `findByMercadoPagoId()`

### Dependency Injection (Nativo do NestJS)
- Injeção via construtor em toda a aplicação
- Configurado nos módulos via array `providers`

### DTO Pattern (Data Transfer Objects)
- Separa modelos de domínio dos contratos da API
- Validação com `class-validator`
- Transformação de tipos com `class-transformer`

### Service Layer Pattern
- `PaymentService` encapsula a lógica de negócio
- Coordena entre controller, repository e serviços externos

### Module-Based Organization (NestJS)
- `PaymentModule`: Agrupa controller, service, repository e serviços externos
- `TemporalModule`: Módulo global para injeção do cliente Temporal

---

## Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| **NestJS 10.x** | Framework HTTP com decorators e DI |
| **PostgreSQL** | Banco de dados relacional |
| **Sequelize ORM** | ORM com TypeScript |
| **Temporal.io** | Orquestração de workflows assíncronos |
| **Mercado Pago API** | Gateway de pagamentos |
| **TypeScript 5.1.3** | Linguagem com tipagem estática |
| **class-validator** | Validação de DTOs |
| **Jest** | Framework de testes |

---

## Fluxo de Dados

### Fluxo 1: Criar Pagamento (Cartão de Crédito)

```
POST /api/payment
→ PaymentController.create()
→ PaymentService.create()
  ├── Cria registro de pagamento (status PENDING)
  ├── Gera referência externa (UUID)
  ├── Inicia workflow Temporal (creditCardPaymentWorkflow)
  └── Retorna Payment DTO

Workflow Temporal (Assíncrono):
  ├── Cria preferência no Mercado Pago
  ├── Salva preference ID e init_point
  ├── Aguarda sinal de callback (timeout 30 min)
  ├── Se timeout: consulta status no Mercado Pago
  └── Atualiza status do pagamento
```

### Fluxo 2: Webhook do Mercado Pago

```
POST /api/payment/webhook/mercadopago
→ PaymentController.handleMercadoPagoWebhook()
→ PaymentService.handleMercadoPagoWebhook()
  ├── Obtém informações do pagamento via API Mercado Pago
  ├── Encontra registro local do pagamento
  ├── Atualiza status do pagamento
  └── Envia sinal para workflow Temporal em espera
```

### Fluxo 3: Worker Temporal (Processo Separado)

```
Processo Worker Temporal
→ Conecta ao servidor Temporal
→ Registra activities do PaymentActivities
→ Escuta tasks na fila configurada
→ Executa activities quando workflows são disparados
→ Usa repository e serviço Mercado Pago dentro das activities
```

---

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/payment` | Criar pagamento |
| `GET` | `/api/payment/:id` | Buscar pagamento por ID |
| `GET` | `/api/payment` | Listar pagamentos com filtros |
| `PUT` | `/api/payment/:id` | Atualizar pagamento |
| `POST` | `/api/payment/webhook/mercadopago` | Webhook do Mercado Pago |

---

## Dependências entre Módulos

### AppModule (Raiz)
- `ConfigModule` - Variáveis de ambiente
- `SequelizeModule` - Banco de dados
- `TemporalModule` - Cliente Temporal (global)
- `PaymentModule` - Módulo de pagamentos

### PaymentModule
- **Providers**: PaymentService, PaymentRepository, MercadoPagoService
- **Exports**: PaymentService
- **Usa**: Entidade Payment via SequelizeModule.forFeature()

### TemporalModule (Global)
- **Providers**: TemporalClientService
- Disponível para todos os módulos via flag `global`

---

## Pontos de Entrada

### Aplicação Principal (`main.ts`)
- Inicializa aplicação NestJS
- Configura ValidationPipe global com whitelist
- Registra prefixo global `/api`
- Inicia na porta configurável (padrão: 3000)

### Worker Temporal (`src/temporal/worker.ts`)
- Processo independente que roda junto com a aplicação principal
- Estabelece conexão com banco de dados
- Registra activities
- Escuta na fila de tasks do Temporal
- Iniciar com: `npm run temporal:worker` ou `npm run temporal:worker:dev`

---

## Pontos Fortes da Arquitetura

- **Separação clara de responsabilidades**: Cada camada tem responsabilidade específica
- **Testável**: Injeção de dependências facilita testes unitários
- **Escalável**: Padrão Repository desacopla acesso a dados
- **Processamento assíncrono**: Temporal.io gerencia workflows de pagamento de forma confiável
- **Type-safe**: Implementação completa em TypeScript com modo strict
- **Abstração de integrações**: Serviço Mercado Pago isolado
- **Modular**: Organização baseada em funcionalidades para fácil extensão

---

## Variáveis de Ambiente

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=payment_db

# Temporal
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=payment-queue

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=your_access_token
MERCADO_PAGO_PUBLIC_KEY=your_public_key
```

---

## Scripts Disponíveis

```bash
npm run build          # Compilar projeto
npm run start          # Iniciar aplicação
npm run start:dev      # Iniciar em modo desenvolvimento
npm run start:prod     # Iniciar em produção
npm run test           # Executar testes
npm run temporal:worker     # Iniciar worker Temporal
npm run temporal:worker:dev # Iniciar worker em modo dev
```
