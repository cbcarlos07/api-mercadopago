const { Client } = require('pg');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'payment_db';

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres',
});

async function createDatabase() {
  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL...');

    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Banco de dados "${dbName}" já existe.`);
    } else {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Banco de dados "${dbName}" criado com sucesso!`);
    }
  } catch (error) {
    console.error('Erro ao criar banco de dados:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
