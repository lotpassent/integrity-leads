require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leads_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

pool.connect((err) => {
  if (err) console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
  else console.log('✅ PostgreSQL conectado com sucesso!');
});

app.use(cors());
app.use(express.json());

// ── ROTAS DE PERGUNTAS ───────────────────────────────────────────────────────
const rotasPerguntas = require('./routes/routes_perguntas')(pool);
app.use('/api/perguntas', rotasPerguntas);

// ── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'diretora2025';

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === PANEL_PASSWORD) {
    res.json({ success: true, token: Buffer.from(`panel:${Date.now()}`).toString('base64') });
  } else {
    res.status(401).json({ success: false, message: 'Senha incorreta.' });
  }
});

// ── CRIAR LEAD ───────────────────────────────────────────────────────────────
app.post('/api/leads', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      consultor_nome, empresa_nome, empresa_setor, empresa_porte,
      contato_nome, contato_cargo, contato_telefone, contato_email,
      cargo_em_aberto, nivel_cargo, quantidade_vagas, urgencia,
      contexto_entrevistado, observacoes,
      respostas_extras, // [{ campo, label, valor }]
    } = req.body;

    if (!consultor_nome || !empresa_nome || !cargo_em_aberto || !urgencia) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios não preenchidos.' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO leads (
        consultor_nome, empresa_nome, empresa_setor, empresa_porte,
        contato_nome, contato_cargo, contato_telefone, contato_email,
        cargo_em_aberto, nivel_cargo, quantidade_vagas, urgencia,
        contexto_entrevistado, observacoes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'triagem')
      RETURNING id, empresa_nome, cargo_em_aberto, criado_em`,
      [
        consultor_nome, empresa_nome, empresa_setor, empresa_porte,
        contato_nome, contato_cargo, contato_telefone, contato_email,
        cargo_em_aberto, nivel_cargo, quantidade_vagas || 1, urgencia,
        contexto_entrevistado, observacoes,
      ]
    );

    const leadId = result.rows[0].id;

    // Salvar respostas das perguntas dinâmicas
    if (Array.isArray(respostas_extras) && respostas_extras.length > 0) {
      for (const r of respostas_extras) {
        if (r.campo && r.label) {
          await client.query(
            `INSERT INTO lead_respostas (lead_id, campo, label, valor) VALUES ($1, $2, $3, $4)`,
            [leadId, r.campo, r.label, r.valor || null]
          );
        }
      }
    }

    await client.query(
      `INSERT INTO leads_historico (lead_id, status_anterior, status_novo, observacao)
       VALUES ($1, NULL, 'triagem', 'Lead criado via formulário')`,
      [leadId]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Lead registrado com sucesso!', lead: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar lead:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
});

// ── LISTAR LEADS ─────────────────────────────────────────────────────────────
app.get('/api/leads', async (req, res) => {
  try {
    const { status, urgencia, consultor, search } = req.query;
    let query = `SELECT * FROM leads WHERE 1=1`;
    const params = [];
    let i = 1;
    if (status)   { query += ` AND status = $${i++}`;   params.push(status); }
    if (urgencia) { query += ` AND urgencia = $${i++}`; params.push(urgencia); }
    if (consultor){ query += ` AND consultor_nome ILIKE $${i++}`; params.push(`%${consultor}%`); }
    if (search)   {
      query += ` AND (empresa_nome ILIKE $${i} OR cargo_em_aberto ILIKE $${i} OR consultor_nome ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }
    query += ` ORDER BY CASE urgencia WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END, criado_em DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, leads: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('Erro ao listar leads:', err);
    res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// ── ATUALIZAR STATUS ─────────────────────────────────────────────────────────
app.patch('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacao, motivo_perda } = req.body;
    const statusValidos = ['triagem','contato_inicial','proposta_enviada','negociacao','fechado_ganho','fechado_perdido'];
    if (!statusValidos.includes(status)) return res.status(400).json({ success: false, message: 'Status inválido.' });
    const leadAtual = await pool.query('SELECT status FROM leads WHERE id = $1', [id]);
    if (leadAtual.rows.length === 0) return res.status(404).json({ success: false, message: 'Lead não encontrado.' });
    await pool.query(`UPDATE leads SET status = $1, motivo_perda = $2 WHERE id = $3`, [status, motivo_perda || null, id]);
    await pool.query(
      `INSERT INTO leads_historico (lead_id, status_anterior, status_novo, observacao) VALUES ($1, $2, $3, $4)`,
      [id, leadAtual.rows[0].status, status, observacao || null]
    );
    res.json({ success: true, message: 'Status atualizado.' });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// ── FRONTEND ──────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/',         (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/painel',   (req, res) => res.sendFile(path.join(__dirname, '../frontend/painel/index.html')));
app.get('/consultor',(req, res) => res.sendFile(path.join(__dirname, '../frontend/consultor/index.html')));

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Formulário consultor: http://localhost:${PORT}/consultor`);
  console.log(`📊 Painel executivo:     http://localhost:${PORT}/painel`);
  console.log(`\n💡 Senha do painel: ${PANEL_PASSWORD}\n`);
});
