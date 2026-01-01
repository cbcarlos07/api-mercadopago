/**
 * Migration Sequelize para criação da tabela payments
 *
 * Para executar:
 * npx sequelize-cli db:migrate
 *
 * Para reverter:
 * npx sequelize-cli db:migrate:undo
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Criar tipos ENUM
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_payment_method') THEN
          CREATE TYPE "enum_payments_payment_method" AS ENUM ('PIX', 'CREDIT_CARD');
        END IF;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_status') THEN
          CREATE TYPE "enum_payments_status" AS ENUM ('PENDING', 'PAID', 'FAIL');
        END IF;
      END $$;
    `);

    // Criar tabela payments
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      cpf: {
        type: Sequelize.STRING(11),
        allowNull: false,
        validate: {
          len: [11, 11],
        },
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      payment_method: {
        type: Sequelize.ENUM('PIX', 'CREDIT_CARD'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'PAID', 'FAIL'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      external_reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      mercado_pago_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Criar índices
    await queryInterface.addIndex('payments', ['cpf'], {
      name: 'idx_payments_cpf',
    });

    await queryInterface.addIndex('payments', ['status'], {
      name: 'idx_payments_status',
    });

    await queryInterface.addIndex('payments', ['payment_method'], {
      name: 'idx_payments_payment_method',
    });

    await queryInterface.addIndex('payments', ['external_reference'], {
      name: 'idx_payments_external_reference',
    });

    await queryInterface.addIndex('payments', ['mercado_pago_id'], {
      name: 'idx_payments_mercado_pago_id',
    });

    await queryInterface.addIndex('payments', ['created_at'], {
      name: 'idx_payments_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remover tabela
    await queryInterface.dropTable('payments');

    // Remover tipos ENUM
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_payments_payment_method";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_payments_status";
    `);
  },
};
