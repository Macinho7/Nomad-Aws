const { Pool } = require('pg');

// Configuração da conexão com o banco de dados
const pool = new Pool({
  user: 'aws',
  database: 'Aws_DB',
  password: 'root',
  port: 5432,
  max: 500,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS "Usuario" (
    id UUID,
    nome VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL,
    email VARCHAR(100)  NOT NULL,
    idade INTEGER NOT NULL,
    país VARCHAR(100) NOT NULL,
    videofoto TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

module.exports.createTable = async () => {
  try {
    const client = await pool.connect();
    await client.query(createTableQuery);
    client.release();
    return ['Tabela criada com sucesso'];
  } catch (error) {
    throw new Error('Erro ao criar a tabela:', error);
  }
};
