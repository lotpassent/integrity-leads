/**
 * routes/routes_perguntas.js
 * Rotas para gerenciamento de perguntas do consultor
 *
 * No server.js:
 *   const rotasPerguntas = require('./routes/routes_perguntas')(pool);
 *   app.use('/api/perguntas', rotasPerguntas);
 */

const express = require('express');

module.exports = function (pool) {
  const router = express.Router();

  // ── Middleware: verifica senha do painel executivo ───────────────────────
  function requireAdmin(req, res, next) {
    const senha = req.headers['x-panel-password'] || req.body?.senha;
    if (senha !== process.env.PANEL_PASSWORD) {
      return res.status(401).json({ erro: 'Não autorizado' });
    }
    next();
  }

  // ── GET /api/perguntas ───────────────────────────────────────────────────
  // Retorna perguntas ATIVAS ordenadas — usado pelo formulário do consultor
  // Perguntas com campo iniciando em "sondagem_" também são retornadas aqui;
  // o frontend decide como exibir cada uma.
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, ordem, campo, label, tipo, opcoes, obrigatorio
         FROM perguntas_consultor
         WHERE ativo = true
         ORDER BY ordem ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao buscar perguntas' });
    }
  });

  // ── GET /api/perguntas/todas ─────────────────────────────────────────────
  // Retorna TODAS (ativas e inativas) — para o painel executivo
  router.get('/todas', requireAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM perguntas_consultor ORDER BY ordem ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao buscar perguntas' });
    }
  });

  // ── PUT /api/perguntas/reordenar/lote ────────────────────────────────────
  // DEVE ficar ANTES de PUT /:id para o Express não confundir "reordenar" com um id
  // Body: { ids: [3, 1, 5, 2] } — array na nova ordem desejada
  router.put('/reordenar/lote', requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ erro: 'ids deve ser um array' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ids.length; i++) {
        await client.query(
          'UPDATE perguntas_consultor SET ordem = $1 WHERE id = $2',
          [(i + 1) * 10, ids[i]]   // múltiplos de 10 para facilitar inserções futuras
        );
      }
      await client.query('COMMIT');
      res.json({ mensagem: 'Ordem atualizada com sucesso.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ erro: 'Erro ao reordenar perguntas' });
    } finally {
      client.release();
    }
  });

  // ── POST /api/perguntas ──────────────────────────────────────────────────
  // Cria nova pergunta
  // Body: { ordem, campo, label, tipo, opcoes, obrigatorio }
  router.post('/', requireAdmin, async (req, res) => {
    const { ordem, campo, label, tipo, opcoes, obrigatorio } = req.body;

    if (!campo || !label || !tipo) {
      return res.status(400).json({ erro: 'campo, label e tipo são obrigatórios' });
    }

    try {
      // Se não informar ordem, coloca depois da última pergunta ativa
      let ordemFinal = ordem;
      if (!ordemFinal) {
        const max = await pool.query(`SELECT COALESCE(MAX(ordem), 0) + 10 AS prox FROM perguntas_consultor`);
        ordemFinal = max.rows[0].prox;
      }

      const result = await pool.query(
        `INSERT INTO perguntas_consultor (ordem, campo, label, tipo, opcoes, obrigatorio)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          ordemFinal,
          campo,
          label,
          tipo,
          opcoes ? JSON.stringify(opcoes) : null,
          obrigatorio || false,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ erro: `Campo "${campo}" já existe. Use outro nome interno (ex: meu_campo_novo).` });
      }
      console.error(err);
      res.status(500).json({ erro: 'Erro ao criar pergunta' });
    }
  });

  // ── PUT /api/perguntas/:id ───────────────────────────────────────────────
  // Atualiza pergunta existente
  // Body: { ordem?, label?, tipo?, opcoes?, obrigatorio?, ativo? }
  router.put('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { ordem, label, tipo, opcoes, obrigatorio, ativo } = req.body;

    try {
      const result = await pool.query(
        `UPDATE perguntas_consultor
         SET ordem       = COALESCE($1, ordem),
             label       = COALESCE($2, label),
             tipo        = COALESCE($3, tipo),
             opcoes      = COALESCE($4::jsonb, opcoes),
             obrigatorio = COALESCE($5, obrigatorio),
             ativo       = COALESCE($6, ativo)
         WHERE id = $7
         RETURNING *`,
        [
          ordem        ?? null,
          label        ?? null,
          tipo         ?? null,
          opcoes != null ? JSON.stringify(opcoes) : null,
          obrigatorio  ?? null,
          ativo        ?? null,
          id,
        ]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ erro: 'Pergunta não encontrada' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao atualizar pergunta' });
    }
  });

  // ── DELETE /api/perguntas/:id ────────────────────────────────────────────
  // Por padrão: soft delete (desativa, não some do banco)
  // Com ?hard=true: exclui fisicamente (use com cuidado — perde respostas antigas)
  router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const hardDelete = req.query.hard === 'true';

    try {
      if (hardDelete) {
        const result = await pool.query(
          `DELETE FROM perguntas_consultor WHERE id = $1 RETURNING id, label`,
          [id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ erro: 'Pergunta não encontrada' });
        }
        return res.json({ mensagem: `Pergunta "${result.rows[0].label}" excluída permanentemente.` });
      }

      // Soft delete
      const result = await pool.query(
        `UPDATE perguntas_consultor SET ativo = false WHERE id = $1 RETURNING id, label`,
        [id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ erro: 'Pergunta não encontrada' });
      }
      res.json({ mensagem: `Pergunta "${result.rows[0].label}" desativada.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao excluir pergunta' });
    }
  });

  return router;
};