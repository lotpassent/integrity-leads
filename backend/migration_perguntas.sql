-- ============================================================
-- MIGRAÇÃO: Sistema de Perguntas Dinâmicas do Consultor
-- Execute este script no banco leads_system (PostgreSQL)
-- ============================================================

-- Tabela de perguntas configuráveis pelo painel executivo
CREATE TABLE IF NOT EXISTS perguntas_consultor (
  id        SERIAL PRIMARY KEY,
  ordem     INTEGER NOT NULL DEFAULT 0,   -- controla a sequência exibida ao consultor
  campo     VARCHAR(100) NOT NULL UNIQUE, -- nome interno (ex: "cargo_em_aberto")
  label     VARCHAR(200) NOT NULL,        -- texto exibido ao consultor
  tipo      VARCHAR(30)  NOT NULL DEFAULT 'text',
            -- tipos: text | textarea | select | number | boolean
  opcoes    JSONB,                        -- para tipo "select": ["opcao1","opcao2"]
  obrigatorio BOOLEAN DEFAULT false,
  ativo     BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Trigger de atualização automática
CREATE OR REPLACE FUNCTION atualizar_timestamp_perguntas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_perguntas_atualizado ON perguntas_consultor;
CREATE TRIGGER trigger_perguntas_atualizado
  BEFORE UPDATE ON perguntas_consultor
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_perguntas();

-- ── PERGUNTAS PADRÃO (baseadas no formulário atual) ──────────────────────────
INSERT INTO perguntas_consultor (ordem, campo, label, tipo, opcoes, obrigatorio) VALUES

(1,  'empresa_nome',      'Nome da Empresa',                       'text',     NULL,   true),
(2,  'empresa_setor',     'Setor / Segmento',                      'text',     NULL,   false),
(3,  'empresa_porte',     'Porte da Empresa',                      'select',
      '["pequena","media","grande","enterprise"]',                              false),

(4,  'contato_nome',      'Nome do Contato',                       'text',     NULL,   false),
(5,  'contato_cargo',     'Cargo do Contato',                      'text',     NULL,   false),
(6,  'contato_email',     'E-mail do Contato',                     'text',     NULL,   false),
(7,  'contato_telefone',  'Telefone do Contato',                   'text',     NULL,   false),

(8,  'cargo_em_aberto',   'Vaga em Aberto (cargo)',                 'text',     NULL,   true),
(9,  'nivel_cargo',       'Nível do Cargo',                        'select',
      '["junior","pleno","senior","especialista","gerencia","diretoria","c-level"]',
                                                                               false),
(10, 'quantidade_vagas',  'Quantidade de Vagas',                   'number',   NULL,   false),
(11, 'urgencia',          'Urgência da Contratação',               'select',
      '["baixa","media","alta","critica"]',                                    true),

(12, 'contexto_entrevistado',
                          'Contexto obtido na entrevista (o que o candidato contou sobre a empresa?)',
                                                                   'textarea',  NULL,  false),
(13, 'observacoes',       'Observações adicionais',                'textarea',  NULL,  false)

ON CONFLICT (campo) DO NOTHING;

-- Índice para ordenação rápida
CREATE INDEX IF NOT EXISTS idx_perguntas_ordem ON perguntas_consultor (ordem) WHERE ativo = true;

SELECT 'Migração concluída: tabela perguntas_consultor criada com ' || COUNT(*) || ' perguntas padrão.'
FROM perguntas_consultor;