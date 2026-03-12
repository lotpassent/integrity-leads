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
app.use(express.static(path.join(__dirname, '../frontend')));

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
// Aceita respostas_extras: [{ campo, label, valor }] das perguntas dinâmicas
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

// ── EXCLUIR LEAD ─────────────────────────────────────────────────────────────
app.delete('/api/leads/:id', async (req, res) => {
  const senha = req.headers['x-panel-password'];
  if (senha !== process.env.PANEL_PASSWORD) return res.status(401).json({ success: false, message: 'Não autorizado.' });
  try {
    const result = await pool.query(
      `DELETE FROM leads WHERE id = $1 RETURNING id, empresa_nome, cargo_em_aberto`, [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Lead não encontrado.' });
    res.json({ success: true, message: `Lead #${req.params.id} excluído.`, lead: result.rows[0] });
  } catch (err) {
    console.error('Erro ao excluir lead:', err);
    res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// ── HISTÓRICO + RESPOSTAS EXTRAS ─────────────────────────────────────────────
app.get('/api/leads/:id/historico', async (req, res) => {
  try {
    const { id } = req.params;
    const [historico, lead, respostas] = await Promise.all([
      pool.query(`SELECT * FROM leads_historico WHERE lead_id = $1 ORDER BY criado_em DESC`, [id]),
      pool.query(`SELECT * FROM leads WHERE id = $1`, [id]),
      pool.query(`SELECT campo, label, valor FROM lead_respostas WHERE lead_id = $1 ORDER BY id ASC`, [id]),
    ]);
    res.json({ success: true, lead: lead.rows[0], historico: historico.rows, respostas_extras: respostas.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// ── DASHBOARD ────────────────────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const [totais, porStatus, porUrgencia, porConsultor, evolucao] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='fechado_ganho' THEN 1 END) as fechados, COUNT(CASE WHEN urgencia IN ('alta','critica') THEN 1 END) as urgentes, COUNT(CASE WHEN criado_em >= NOW() - INTERVAL '7 days' THEN 1 END) as esta_semana FROM leads`),
      pool.query(`SELECT status, COUNT(*) as total FROM leads GROUP BY status ORDER BY total DESC`),
      pool.query(`SELECT urgencia, COUNT(*) as total FROM leads GROUP BY urgencia`),
      pool.query(`SELECT * FROM vw_performance_consultores`),
      pool.query(`SELECT DATE(criado_em) as data, COUNT(*) as total FROM leads WHERE criado_em >= NOW() - INTERVAL '30 days' GROUP BY DATE(criado_em) ORDER BY data`),
    ]);
    res.json({ success: true, metricas: { totais: totais.rows[0], por_status: porStatus.rows, por_urgencia: porUrgencia.rows, por_consultor: porConsultor.rows, evolucao_30_dias: evolucao.rows } });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// ── CONSULTORES ───────────────────────────────────────────────────────────────
app.get('/api/consultores', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM consultores WHERE ativo = true ORDER BY nome`);
    res.json({ success: true, consultores: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// ── EXPORTAR XLSX ─────────────────────────────────────────────────────────────
app.get('/api/leads/exportar/xlsx', async (req, res) => {
  const { execFile } = require('child_process');
  const os = require('os'); const fs = require('fs'); const pathM = require('path');
  try {
    const { status, urgencia, consultor, data_inicio, data_fim } = req.query;
    let query = `SELECT * FROM leads WHERE 1=1`; const params = []; let i = 1;
    if (status)      { query += ` AND status = $${i++}`;             params.push(status); }
    if (urgencia)    { query += ` AND urgencia = $${i++}`;           params.push(urgencia); }
    if (consultor)   { query += ` AND consultor_nome ILIKE $${i++}`; params.push(`%${consultor}%`); }
    if (data_inicio) { query += ` AND criado_em >= $${i++}`;         params.push(data_inicio); }
    if (data_fim)    { query += ` AND criado_em <= $${i++}`;         params.push(data_fim + 'T23:59:59'); }
    query += ` ORDER BY CASE urgencia WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END, criado_em DESC`;
    const result = await pool.query(query, params);
    const leads = result.rows.map(r => ({ ...r, criado_em: r.criado_em?.toISOString()||'', atualizado_em: r.atualizado_em?.toISOString()||'' }));
    const tmpJson = pathM.join(os.tmpdir(), `leads_${Date.now()}.json`);
    const tmpXlsx = pathM.join(os.tmpdir(), `relatorio_${Date.now()}.xlsx`);
    fs.writeFileSync(tmpJson, JSON.stringify(leads));
    const scriptPath = pathM.join(__dirname, 'generate_xlsx.py');
    function sendFile() {
      try { fs.unlinkSync(tmpJson); } catch {}
      if (!fs.existsSync(tmpXlsx)) return res.status(500).json({ success: false, message: 'Arquivo não gerado.' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Integrity_Leads_${new Date().toISOString().split('T')[0]}.xlsx"`);
      const stream = fs.createReadStream(tmpXlsx);
      stream.pipe(res);
      stream.on('end', () => { try { fs.unlinkSync(tmpXlsx); } catch {} });
    }
    execFile('python3', [scriptPath, tmpJson, tmpXlsx], { timeout: 30000 }, (err) => {
      if (err) { execFile('python', [scriptPath, tmpJson, tmpXlsx], { timeout: 30000 }, (err2) => { if (err2) return res.status(500).json({ success: false, message: 'Erro ao gerar planilha.' }); sendFile(); }); return; }
      sendFile();
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Erro interno.' }); }
});

// ── EXPORTAR CSV ──────────────────────────────────────────────────────────────
app.get('/api/leads/exportar/csv', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, consultor_nome, empresa_nome, empresa_setor, empresa_porte, contato_nome, contato_cargo, contato_email, contato_telefone, cargo_em_aberto, nivel_cargo, quantidade_vagas, urgencia, status, observacoes, contexto_entrevistado, TO_CHAR(criado_em,'DD/MM/YYYY HH24:MI') as criado_em, TO_CHAR(atualizado_em,'DD/MM/YYYY HH24:MI') as atualizado_em FROM leads ORDER BY criado_em DESC`);
    const headers = ['ID','Consultor','Empresa','Setor','Porte','Contato','Cargo Contato','E-mail','Telefone','Vaga em Aberto','Nível','Qtd Vagas','Urgência','Status','Observações','Contexto','Criado em','Atualizado em'];
    const csv = [headers.join(';'), ...result.rows.map(r => [r.id,r.consultor_nome,r.empresa_nome,r.empresa_setor||'',r.empresa_porte||'',r.contato_nome||'',r.contato_cargo||'',r.contato_email||'',r.contato_telefone||'',r.cargo_em_aberto,r.nivel_cargo||'',r.quantidade_vagas,r.urgencia,r.status,(r.observacoes||'').replace(/;/g,','),(r.contexto_entrevistado||'').replace(/;/g,','),r.criado_em,r.atualizado_em].map(v=>`"${v}"`).join(';'))].join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="leads_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) { res.status(500).json({ success: false, message: 'Erro ao exportar.' }); }
});

// ── FRONTEND ──────────────────────────────────────────────────────────────────
app.get('/',         (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/painel',   (req, res) => res.sendFile(path.join(__dirname, '../frontend/painel/index.html')));
app.get('/consultor',(req, res) => res.sendFile(path.join(__dirname, '../frontend/consultor/index.html')));

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Formulário consultor: http://localhost:${PORT}/consultor`);
  console.log(`📊 Painel executivo:     http://localhost:${PORT}/painel`);
  console.log(`\n💡 Senha do painel: ${PANEL_PASSWORD}\n`);
});