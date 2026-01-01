-- =============================================
-- Script SQL para criação do banco de dados Payment API
-- =============================================

-- Criar o banco de dados (execute este comando separadamente se necessário)
-- CREATE DATABASE payment_db;

-- Conectar ao banco de dados payment_db antes de executar os comandos abaixo

-- =============================================
-- Criação dos tipos ENUM
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('PIX', 'CREDIT_CARD');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'FAIL');
    END IF;
END $$;

-- =============================================
-- Criação da tabela payments
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_enum NOT NULL,
    status payment_status_enum NOT NULL DEFAULT 'PENDING',
    external_reference VARCHAR(255),
    mercado_pago_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Criação de índices para otimização de consultas
-- =============================================

CREATE INDEX IF NOT EXISTS idx_payments_cpf ON payments(cpf);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_external_reference ON payments(external_reference);
CREATE INDEX IF NOT EXISTS idx_payments_mercado_pago_id ON payments(mercado_pago_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- =============================================
-- Função para atualizar o campo updated_at automaticamente
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- Trigger para atualizar updated_at
-- =============================================

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Comentários nas colunas (documentação)
-- =============================================

COMMENT ON TABLE payments IS 'Tabela que armazena os registros de pagamentos';
COMMENT ON COLUMN payments.id IS 'Identificador único do pagamento (auto-incrementado)';
COMMENT ON COLUMN payments.cpf IS 'CPF do cliente (11 dígitos)';
COMMENT ON COLUMN payments.description IS 'Descrição da cobrança';
COMMENT ON COLUMN payments.amount IS 'Valor da transação';
COMMENT ON COLUMN payments.payment_method IS 'Meio de pagamento: PIX ou CREDIT_CARD';
COMMENT ON COLUMN payments.status IS 'Status do pagamento: PENDING, PAID ou FAIL';
COMMENT ON COLUMN payments.external_reference IS 'Referência externa para integração com Mercado Pago';
COMMENT ON COLUMN payments.mercado_pago_id IS 'ID da preferência no Mercado Pago';
COMMENT ON COLUMN payments.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN payments.updated_at IS 'Data da última atualização do registro';
