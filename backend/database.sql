-- ============================================
-- SISTEMA DE LEADS COMERCIAIS
-- Script de criação do banco de dados
-- ============================================

-- Criar banco (rode este comando separadamente no pgAdmin se necessário)
-- CREATE DATABASE leads_system;

-- Tabela de Consultores
CREATE TABLE IF NOT EXISTS consultores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  
  -- Consultor que gerou o lead
  consultor_nome VARCHAR(100) NOT NULL,
  
  -- Dados da empresa prospectada
  empresa_nome VARCHAR(200) NOT NULL,
  empresa_setor VARCHAR(100),
  empresa_porte VARCHAR(50), -- pequena, media, grande, enterprise
  
  -- Contato da empresa
  contato_nome VARCHAR(150),
  contato_cargo VARCHAR(100),
  contato_telefone VARCHAR(30),
  contato_email VARCHAR(150),
  
  -- Detalhes da oportunidade
  cargo_em_aberto VARCHAR(200) NOT NULL,
  nivel_cargo VARCHAR(50), -- junior, pleno, senior, gerencia, diretoria, c-level
  quantidade_vagas INTEGER DEFAULT 1,
  urgencia VARCHAR(20) NOT NULL, -- baixa, media, alta, critica
  
  -- Contexto obtido na entrevista
  contexto_entrevistado TEXT,
  observacoes TEXT,
  
  -- Funil comercial
  status VARCHAR(50) DEFAULT 'triagem', -- triagem, contato_inicial, proposta_enviada, negociacao, fechado_ganho, fechado_perdido
  motivo_perda TEXT,
  
  -- Metadados
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de Histórico de Status (para rastrear movimentações no funil)
CREATE TABLE IF NOT EXISTS leads_historico (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50) NOT NULL,
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger de atualização automática
DROP TRIGGER IF EXISTS trigger_leads_atualizado ON leads;
CREATE TRIGGER trigger_leads_atualizado
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- Dados de exemplo para consultores
INSERT INTO consultores (nome, email) VALUES
  ('Ana Paula Silva', 'ana.paula@consultoria.com'),
  ('Carlos Mendes', 'carlos.mendes@consultoria.com'),
  ('Fernanda Costa', 'fernanda.costa@consultoria.com')
ON CONFLICT (email) DO NOTHING;

-- Leads de exemplo para visualização
INSERT INTO leads (
  consultor_nome, empresa_nome, empresa_setor, empresa_porte,
  contato_nome, contato_cargo, contato_email,
  cargo_em_aberto, nivel_cargo, quantidade_vagas, urgencia,
  contexto_entrevistado, observacoes, status
) VALUES
(
  'Ana Paula Silva', 'TechBank S.A.', 'Financeiro', 'grande',
  'Roberto Almeida', 'Gerente de RH', 'roberto@techbank.com.br',
  'Analista de Dados Sênior', 'senior', 2, 'alta',
  'Candidato mencionou que o time de dados está crescendo 40% e precisam de reforço urgente.',
  'Empresa em expansão, budget aprovado. Contato muito receptivo.',
  'proposta_enviada'
),
(
  'Carlos Mendes', 'Grupo Meridian', 'Varejo', 'grande',
  'Claudia Torres', 'Diretora de Pessoas', 'claudia@meridian.com.br',
  'Gerente Comercial Regional', 'gerencia', 1, 'critica',
  'Candidata relatou saída recente do gerente regional, posição descoberta há 2 meses.',
  'Urgência real. Ligar ainda esta semana.',
  'contato_inicial'
),
(
  'Fernanda Costa', 'Startup Innovare', 'Tecnologia', 'media',
  NULL, NULL, NULL,
  'Desenvolvedor Full Stack', 'pleno', 3, 'media',
  'Candidato saiu pois a startup está contratando muito mas sem processo estruturado.',
  'Potencial para parceria de longo prazo.',
  'triagem'
),
(
  'Ana Paula Silva', 'Construtora Vega', 'Construção Civil', 'grande',
  'Marcos Silveira', 'CEO', 'marcos@vega.com.br',
  'CFO', 'diretoria', 1, 'alta',
  'Candidato é o atual CFO e mencionou que estão buscando sucessor.',
  'Oportunidade de alto valor. Requerer abordagem cuidadosa.',
  'negociacao'
),
(
  'Carlos Mendes', 'Farmácia Saúde+', 'Saúde', 'media',
  'Patrícia Lemos', 'Sócia-proprietária', 'patricia@saudemais.com',
  'Farmacêutico Responsável', 'senior', 1, 'baixa',
  'Candidata mencionou dificuldade em encontrar profissionais qualificados na região.',
  'Mercado aquecido para a área.',
  'fechado_ganho'
);

-- View para relatório executivo
CREATE OR REPLACE VIEW vw_resumo_leads AS
SELECT
  status,
  urgencia,
  COUNT(*) as total,
  COUNT(CASE WHEN criado_em >= NOW() - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias
FROM leads
GROUP BY status, urgencia;

-- View para performance por consultor
CREATE OR REPLACE VIEW vw_performance_consultores AS
SELECT
  consultor_nome,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN status = 'fechado_ganho' THEN 1 END) as fechados_ganho,
  COUNT(CASE WHEN status = 'proposta_enviada' OR status = 'negociacao' THEN 1 END) as em_negociacao,
  COUNT(CASE WHEN urgencia IN ('alta', 'critica') THEN 1 END) as leads_urgentes,
  COUNT(CASE WHEN criado_em >= NOW() - INTERVAL '7 days' THEN 1 END) as leads_esta_semana
FROM leads
GROUP BY consultor_nome
ORDER BY total_leads DESC;

SELECT 'Banco de dados criado com sucesso!' as mensagem;
