const { Pool } = require('pg');

// AJUSTE SUAS CREDENCIAIS AQUI SE DESEJAR CONECTAR AO BANCO LOCAL:
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'mkvn09'; // <-- DIGITE SUA SENHA DO POSTGRES AQUI
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'postgres';

let isDbConnected = false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 3000
});

// Base em memória de contingência (caso o banco esteja offline ou com senha incorreta)
let memoryTickets = [
  {
    id: 1,
    titulo: "Divergência de Preço - Cardápio Almoço",
    origem: "Auditoria SOP",
    severidade: "Crítica",
    descricao: "Preços lançados no Gattaran com 15% de acréscimo sem respaldo na fonte Dine-in.",
    custo_prejuizo: 420.00,
    status: "Em Análise",
    created_at: new Date().toISOString(),
    causa_id: 1,
    por_que_1: "O analista cadastrou o preço Delivery em vez de Dine-In",
    por_que_2: "A aba de conferência não estava sinalizada",
    por_que_3: "Faltou dupla checagem na finalização",
    por_que_4: "Meta de TMA alta no turno de pico",
    por_que_5: "Falta de trava visual no sistema de cadastro",
    conclusao_causa: "Ausência de conferência cruzada entre fonte física e Gattaran",
    plano_id: 1,
    what: "Revisão e correção imediata dos preços no 99Admin",
    why: "Evitar contestação de clientes e prejuízo ao parceiro",
    where: "Plataforma Gattaran / Squad 1",
    who: "Marcus Vinicius",
    when: "2026-10-27",
    how: "Exportação da planilha e alinhamento individual 1:1",
    how_much: 0.00,
    status_acao: "Em Andamento"
  },
  {
    id: 2,
    titulo: "Ausência de Fotos em Lojas de Açaí",
    origem: "Operação HRO",
    severidade: "Média",
    descricao: "Itens criados sem imagem mesmo havendo disponibilidade de fotos na fonte.",
    custo_prejuizo: 150.00,
    status: "Aberto",
    created_at: new Date().toISOString(),
    causa_id: null,
    conclusao_causa: null,
    plano_id: null,
    what: null
  }
];

async function initDB() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS tickets_qualidade (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      origem VARCHAR(100) NOT NULL,
      severidade VARCHAR(50) NOT NULL,
      descricao TEXT NOT NULL,
      custo_prejuizo NUMERIC(12, 2) DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'Aberto',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS causa_raiz (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets_qualidade(id) ON DELETE CASCADE,
      por_que_1 TEXT,
      por_que_2 TEXT,
      por_que_3 TEXT,
      por_que_4 TEXT,
      por_que_5 TEXT,
      conclusao_causa TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plano_acao_5w2h (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets_qualidade(id) ON DELETE CASCADE,
      what TEXT NOT NULL,
      why TEXT NOT NULL,
      where_loc TEXT NOT NULL,
      who TEXT NOT NULL,
      when_date VARCHAR(100) NOT NULL,
      how TEXT NOT NULL,
      how_much NUMERIC(12, 2) DEFAULT 0.00,
      status_acao VARCHAR(50) DEFAULT 'Planejado',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const client = await pool.connect();
  try {
    await client.query(queryText);
    isDbConnected = true;
  } finally {
    client.release();
  }
}

async function findAll() {
  if (!isDbConnected) return memoryTickets;

  try {
    const query = `
      SELECT 
        t.id, t.titulo, t.origem, t.severidade, t.descricao,
        t.custo_prejuizo::float AS custo_prejuizo, t.status, t.created_at, t.updated_at,
        c.id AS causa_id, c.por_que_1, c.por_que_2, c.por_que_3, c.por_que_4, c.por_que_5, c.conclusao_causa,
        p.id AS plano_id, p.what, p.why, p.where_loc AS "where", p.who, p.when_date AS "when", p.how,
        p.how_much::float AS how_much, p.status_acao
      FROM tickets_qualidade t
      LEFT JOIN causa_raiz c ON c.ticket_id = t.id
      LEFT JOIN plano_acao_5w2h p ON p.ticket_id = t.id
      ORDER BY t.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (e) {
    return memoryTickets;
  }
}

async function findById(id) {
  if (!isDbConnected) {
    return memoryTickets.find(t => t.id === parseInt(id, 10)) || null;
  }

  const query = `
    SELECT 
      t.id, t.titulo, t.origem, t.severidade, t.descricao,
      t.custo_prejuizo::float AS custo_prejuizo, t.status, t.created_at, t.updated_at,
      c.id AS causa_id, c.por_que_1, c.por_que_2, c.por_que_3, c.por_que_4, c.por_que_5, c.conclusao_causa,
      p.id AS plano_id, p.what, p.why, p.where_loc AS "where", p.who, p.when_date AS "when", p.how,
      p.how_much::float AS how_much, p.status_acao
    FROM tickets_qualidade t
    LEFT JOIN causa_raiz c ON c.ticket_id = t.id
    LEFT JOIN plano_acao_5w2h p ON p.ticket_id = t.id
    WHERE t.id = $1;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function create(data) {
  if (!isDbConnected) {
    const newTicket = {
      id: Math.floor(100 + Math.random() * 900),
      ...data,
      created_at: new Date().toISOString(),
      causa_id: null,
      plano_id: null
    };
    memoryTickets.unshift(newTicket);
    return newTicket;
  }

  const query = `
    INSERT INTO tickets_qualidade (titulo, origem, severidade, descricao, custo_prejuizo, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [data.titulo, data.origem, data.severidade, data.descricao, data.custo_prejuizo || 0, data.status || 'Aberto'];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function update(id, data) {
  if (!isDbConnected) {
    const idx = memoryTickets.findIndex(t => t.id === parseInt(id, 10));
    if (idx === -1) return null;
    memoryTickets[idx] = { ...memoryTickets[idx], ...data };
    return memoryTickets[idx];
  }

  const query = `
    UPDATE tickets_qualidade
    SET titulo = $1, origem = $2, severidade = $3, descricao = $4, custo_prejuizo = $5, status = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *;
  `;
  const values = [data.titulo, data.origem, data.severidade, data.descricao, data.custo_prejuizo, data.status, id];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function remove(id) {
  if (!isDbConnected) {
    const idx = memoryTickets.findIndex(t => t.id === parseInt(id, 10));
    if (idx === -1) return null;
    const removed = memoryTickets.splice(idx, 1);
    return removed[0];
  }

  const query = `DELETE FROM tickets_qualidade WHERE id = $1 RETURNING id;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function upsertCausaRaiz(ticketId, data) {
  if (!isDbConnected) {
    const t = memoryTickets.find(item => item.id === parseInt(ticketId, 10));
    if (t) {
      t.causa_id = t.causa_id || Math.floor(100 + Math.random() * 900);
      t.por_que_1 = data.por_que_1;
      t.por_que_2 = data.por_que_2;
      t.por_que_3 = data.por_que_3;
      t.por_que_4 = data.por_que_4;
      t.por_que_5 = data.por_que_5;
      t.conclusao_causa = data.conclusao_causa;
    }
    return data;
  }

  const query = `
    INSERT INTO causa_raiz (ticket_id, por_que_1, por_que_2, por_que_3, por_que_4, por_que_5, conclusao_causa, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    ON CONFLICT (ticket_id) DO UPDATE SET
      por_que_1 = EXCLUDED.por_que_1,
      por_que_2 = EXCLUDED.por_que_2,
      por_que_3 = EXCLUDED.por_que_3,
      por_que_4 = EXCLUDED.por_que_4,
      por_que_5 = EXCLUDED.por_que_5,
      conclusao_causa = EXCLUDED.conclusao_causa,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const values = [ticketId, data.por_que_1, data.por_que_2, data.por_que_3, data.por_que_4, data.por_que_5, data.conclusao_causa];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function upsertPlano5W2H(ticketId, data) {
  if (!isDbConnected) {
    const t = memoryTickets.find(item => item.id === parseInt(ticketId, 10));
    if (t) {
      t.plano_id = t.plano_id || Math.floor(100 + Math.random() * 900);
      t.what = data.what;
      t.why = data.why;
      t.where = data.where;
      t.who = data.who;
      t.when = data.when;
      t.how = data.how;
      t.how_much = data.how_much;
      t.status_acao = data.status_acao;
    }
    return data;
  }

  const query = `
    INSERT INTO plano_acao_5w2h (ticket_id, what, why, where_loc, who, when_date, how, how_much, status_acao, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    ON CONFLICT (ticket_id) DO UPDATE SET
      what = EXCLUDED.what,
      why = EXCLUDED.why,
      where_loc = EXCLUDED.where_loc,
      who = EXCLUDED.who,
      when_date = EXCLUDED.when_date,
      how = EXCLUDED.how,
      how_much = EXCLUDED.how_much,
      status_acao = EXCLUDED.status_acao,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const values = [ticketId, data.what, data.why, data.where, data.who, data.when, data.how, data.how_much || 0, data.status_acao || 'Planejado'];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function getMetrics() {
  const tickets = await findAll();
  const statusMap = {};
  const severityMap = {};
  let totalPrejuizo = 0;

  tickets.forEach(t => {
    statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    severityMap[t.severidade] = (severityMap[t.severidade] || 0) + 1;
    totalPrejuizo += Number(t.custo_prejuizo) || 0;
  });

  return {
    statusBreakdown: Object.keys(statusMap).map(k => ({ status: k, count: statusMap[k] })),
    severityBreakdown: Object.keys(severityMap).map(k => ({ severidade: k, count: severityMap[k] })),
    financialSummary: { custo_total_prejuizo: totalPrejuizo, total_tickets: tickets.length }
  };
}

module.exports = {
  pool,
  initDB,
  findAll,
  findById,
  create,
  update,
  remove,
  upsertCausaRaiz,
  upsertPlano5W2H,
  getMetrics
};