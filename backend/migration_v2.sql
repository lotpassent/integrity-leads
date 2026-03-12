CREATE TABLE IF NOT EXISTS lead_respostas (
  id        SERIAL PRIMARY KEY,
  lead_id   INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campo     VARCHAR(100) NOT NULL,
  label     TEXT NOT NULL,
  valor     TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_respostas_lead_id ON lead_respostas (lead_id);

ALTER TABLE perguntas_consultor
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS subcampos JSONB;

SELECT 'Migração v2 concluída.' as resultado;