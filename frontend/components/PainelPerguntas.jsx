/**
 * PainelPerguntas.jsx
 * Componente React — Gerenciar Perguntas do Consultor
 *
 * Como usar:
 *   <PainelPerguntas apiBase="http://localhost:3001" senhaAdmin={senhaArmazenada} />
 */

import { useState, useEffect, useRef } from "react";

// ── Tipos disponíveis ───────────────────────────────────────────────────────
const TIPOS = [
  { value: "text",     label: "Texto curto",      icon: "✏️",  desc: "Campo de uma linha" },
  { value: "textarea", label: "Texto longo",       icon: "📝",  desc: "Área para respostas detalhadas" },
  { value: "select",   label: "Lista de opções",   icon: "📋",  desc: "Menu com opções pré-definidas" },
  { value: "number",   label: "Número",            icon: "🔢",  desc: "Valor numérico" },
  { value: "boolean",  label: "Sim / Não",         icon: "✅",  desc: "Escolha binária" },
];

// ── Estilos (CSS-in-JS com variáveis Integrity) ────────────────────────────
const COLORS = {
  tealDeep:    "#0C2022",
  tealMid:     "#1D4D4F",
  tealAccent:  "#2A6B6D",
  amber:       "#D4832A",
  amberLight:  "#E8A455",
  cream:       "#F4F1EC",
  creamDim:    "rgba(196,187,174,0.55)",
  white:       "#FAFAF8",
  border:      "rgba(42,107,109,0.3)",
  borderAmb:   "rgba(212,131,42,0.2)",
  inputBg:     "rgba(15,40,42,0.7)",
  error:       "#E07777",
  success:     "#4CAF82",
};

// ── Popup de Confirmação ───────────────────────────────────────────────────
function ConfirmPopup({ config, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onCancel(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  if (!config) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(8,18,20,0.75)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
      animation: "fadeInPopup 0.18s ease",
    }}>
      <style>{`
        @keyframes fadeInPopup { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
      `}</style>
      <div ref={ref} style={{
        background: COLORS.tealMid,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        padding: "2rem 2rem 1.5rem",
        maxWidth: 420, width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        position: "relative",
      }}>
        {/* Linha decorativa topo */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.amber}, transparent)`,
          borderRadius: "0 0 4px 4px",
        }} />

        {/* Ícone */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(224,119,119,0.1)",
          border: "1.5px solid rgba(224,119,119,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.4rem", margin: "0 0 1.25rem",
        }}>
          {config.icon || "⚠️"}
        </div>

        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "1.35rem", fontWeight: 500,
          color: COLORS.white, marginBottom: "0.5rem", lineHeight: 1.2,
        }}>
          {config.titulo}
        </div>

        <div style={{
          fontSize: "0.85rem", color: COLORS.creamDim,
          lineHeight: 1.6, marginBottom: "1.75rem",
        }}>
          {config.descricao}
        </div>

        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "0.75rem",
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10, cursor: "pointer",
            color: COLORS.creamDim, fontSize: "0.85rem",
            fontFamily: "'Outfit', sans-serif",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.target.style.color = COLORS.cream; e.target.style.borderColor = "rgba(42,107,109,0.6)"; }}
          onMouseLeave={e => { e.target.style.color = COLORS.creamDim; e.target.style.borderColor = COLORS.border; }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "0.75rem",
            background: config.corBtn || "rgba(224,119,119,0.15)",
            border: `1px solid ${config.borderBtn || "rgba(224,119,119,0.4)"}`,
            borderRadius: 10, cursor: "pointer",
            color: config.corTextoBtn || COLORS.error,
            fontSize: "0.85rem", fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.target.style.background = config.hoverBtn || "rgba(224,119,119,0.25)"; }}
          onMouseLeave={e => { e.target.style.background = config.corBtn || "rgba(224,119,119,0.15)"; }}>
            {config.labelConfirmar || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast de feedback ─────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  const ok = msg.tipo === "ok";
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 900,
      background: ok ? "rgba(29,77,79,0.95)" : "rgba(60,20,20,0.95)",
      border: `1px solid ${ok ? COLORS.tealAccent : "rgba(224,119,119,0.4)"}`,
      borderRadius: 12, padding: "0.85rem 1.2rem",
      color: ok ? COLORS.cream : COLORS.error,
      fontSize: "0.85rem", fontFamily: "'Outfit', sans-serif",
      display: "flex", alignItems: "center", gap: "0.6rem",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      backdropFilter: "blur(8px)",
      animation: "slideInToast 0.3s cubic-bezier(0.16,1,0.3,1)",
      maxWidth: 340,
    }}>
      <style>{`@keyframes slideInToast { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
      <span style={{ fontSize: "1rem" }}>{ok ? "✓" : "!"}</span>
      {msg.texto}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function PainelPerguntas({ apiBase = "http://localhost:3001", senhaAdmin = "" }) {
  const [perguntas, setPerguntas]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando]     = useState(null);
  const [adicionando, setAdicionando] = useState(false);
  const [msg, setMsg]               = useState(null);
  const [popup, setPopup]           = useState(null); // { titulo, descricao, icon, onConfirm, ... }
  const [form, setForm]             = useState({
    campo: "", label: "", tipo: "text", opcoes: "", obrigatorio: false, ordem: "",
  });

  const headers = {
    "Content-Type": "application/json",
    "x-panel-password": senhaAdmin,
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  const carregar = async () => {
    setCarregando(true);
    try {
      const r = await fetch(`${apiBase}/api/perguntas/todas`, { headers });
      const data = await r.json();
      setPerguntas(Array.isArray(data) ? data : []);
    } catch {
      toast("erro", "Erro ao carregar perguntas. Verifique a conexão.");
    }
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const toast = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 3500);
  };

  // ── Salvar nova ───────────────────────────────────────────────────────────
  const salvarNova = async () => {
    if (!form.campo || !form.label) return toast("erro", "Preencha o nome interno e o texto da pergunta.");
    const opcoes = form.tipo === "select"
      ? form.opcoes.split("\n").map(s => s.trim()).filter(Boolean)
      : null;
    const r = await fetch(`${apiBase}/api/perguntas`, {
      method: "POST", headers,
      body: JSON.stringify({ ...form, opcoes, ordem: form.ordem || undefined }),
    });
    const data = await r.json();
    if (!r.ok) return toast("erro", data.erro || "Erro ao criar.");
    toast("ok", `Pergunta "${data.label}" criada com sucesso.`);
    setAdicionando(false);
    setForm({ campo: "", label: "", tipo: "text", opcoes: "", obrigatorio: false, ordem: "" });
    carregar();
  };

  // ── Salvar edição ─────────────────────────────────────────────────────────
  const salvarEdicao = async (id) => {
    const p = perguntas.find(x => x.id === id);
    const opcoes = p.tipo === "select"
      ? (typeof p.opcoes === "string" ? p.opcoes.split("\n").map(s => s.trim()).filter(Boolean) : p.opcoes)
      : null;
    const r = await fetch(`${apiBase}/api/perguntas/${id}`, {
      method: "PUT", headers, body: JSON.stringify({ ...p, opcoes }),
    });
    const data = await r.json();
    if (!r.ok) return toast("erro", data.erro || "Erro ao salvar.");
    toast("ok", "Pergunta atualizada!");
    setEditando(null); carregar();
  };

  // ── Desativar (com popup) ─────────────────────────────────────────────────
  const desativar = (id, label) => {
    setPopup({
      titulo: "Desativar pergunta?",
      descricao: `"${label}" será removida do formulário do consultor. Você pode reativá-la depois.`,
      icon: "🔒",
      labelConfirmar: "Desativar",
      corBtn: "rgba(212,131,42,0.12)",
      borderBtn: "rgba(212,131,42,0.4)",
      corTextoBtn: COLORS.amberLight,
      hoverBtn: "rgba(212,131,42,0.22)",
      onConfirm: async () => {
        setPopup(null);
        const r = await fetch(`${apiBase}/api/perguntas/${id}`, { method: "DELETE", headers });
        const data = await r.json();
        if (!r.ok) return toast("erro", data.erro || "Erro.");
        toast("ok", data.mensagem);
        carregar();
      },
    });
  };

  // ── Excluir permanentemente (com popup) ───────────────────────────────────
  const excluirPermanente = (id, label) => {
    setPopup({
      titulo: "Excluir permanentemente?",
      descricao: `"${label}" será excluída do banco de dados. Esta ação não pode ser desfeita.`,
      icon: "🗑️",
      labelConfirmar: "Excluir",
      onConfirm: async () => {
        setPopup(null);
        const r = await fetch(`${apiBase}/api/perguntas/${id}?hard=true`, { method: "DELETE", headers });
        const data = await r.json();
        if (!r.ok) return toast("erro", data.erro || "Erro.");
        toast("ok", data.mensagem);
        carregar();
      },
    });
  };

  // ── Reativar ──────────────────────────────────────────────────────────────
  const reativar = async (id) => {
    const r = await fetch(`${apiBase}/api/perguntas/${id}`, {
      method: "PUT", headers, body: JSON.stringify({ ativo: true }),
    });
    if (r.ok) { toast("ok", "Pergunta reativada!"); carregar(); }
  };

  // ── Mover ordem ───────────────────────────────────────────────────────────
  const moverOrdem = async (id, dir) => {
    const ativas = perguntas.filter(p => p.ativo).sort((a, b) => a.ordem - b.ordem);
    const idx = ativas.findIndex(p => p.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === ativas.length - 1) return;
    const nova = [...ativas];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    [nova[idx], nova[swap]] = [nova[swap], nova[idx]];
    await fetch(`${apiBase}/api/perguntas/reordenar/lote`, {
      method: "PUT", headers,
      body: JSON.stringify({ ids: nova.map(p => p.id) }),
    });
    carregar();
  };

  const ativas   = perguntas.filter(p => p.ativo).sort((a, b) => a.ordem - b.ordem);
  const inativas = perguntas.filter(p => !p.ativo);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif",
      background: COLORS.tealDeep,
      minHeight: "100vh",
      color: COLORS.cream,
      padding: "0",
    }}>

      {/* Popup */}
      <ConfirmPopup
        config={popup}
        onConfirm={popup?.onConfirm}
        onCancel={() => setPopup(null)}
      />

      {/* Toast */}
      <Toast msg={msg} />

      {/* Header */}
      <div style={{
        background: "rgba(29,77,79,0.3)",
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "1.5rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        backdropFilter: "blur(10px)",
      }}>
        <div>
          <div style={{
            fontSize: "0.65rem", textTransform: "uppercase",
            letterSpacing: "0.18em", color: COLORS.amber, marginBottom: "0.3rem",
          }}>
            Painel Executivo — Configuração
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.5rem", fontWeight: 500, color: COLORS.white, lineHeight: 1.2,
          }}>
            Perguntas do Formulário
          </div>
          <div style={{ fontSize: "0.78rem", color: COLORS.creamDim, marginTop: "0.2rem" }}>
            {ativas.length} pergunta{ativas.length !== 1 ? "s" : ""} ativa{ativas.length !== 1 ? "s" : ""} no formulário do consultor
          </div>
        </div>
        <button
          onClick={() => setAdicionando(!adicionando)}
          style={{
            background: adicionando ? "rgba(224,119,119,0.1)" : COLORS.amber,
            color: adicionando ? COLORS.error : COLORS.tealDeep,
            border: adicionando ? `1px solid rgba(224,119,119,0.3)` : "none",
            borderRadius: 10, padding: "0.7rem 1.3rem",
            fontWeight: 700, cursor: "pointer", fontSize: "0.82rem",
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "0.03em",
            transition: "all 0.2s",
          }}
        >
          {adicionando ? "✕ Cancelar" : "+ Nova Pergunta"}
        </button>
      </div>

      <div style={{ padding: "1.5rem 2rem", maxWidth: 900, margin: "0 auto" }}>

        {/* Formulário nova pergunta */}
        {adicionando && (
          <div style={{
            background: "rgba(29,77,79,0.25)",
            border: `1px solid rgba(212,131,42,0.3)`,
            borderRadius: 16, padding: "1.5rem",
            marginBottom: "1.5rem",
            position: "relative", overflow: "hidden",
          }}>
            {/* Linha decorativa */}
            <div style={{
              position: "absolute", top: 0, left: "10%", right: "10%", height: 2,
              background: `linear-gradient(90deg, transparent, ${COLORS.amber}, transparent)`,
            }} />

            <div style={{
              fontSize: "0.65rem", textTransform: "uppercase",
              letterSpacing: "0.15em", color: COLORS.amber, marginBottom: "1rem",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 6,
                background: "rgba(212,131,42,0.12)",
                border: `1px solid rgba(212,131,42,0.25)`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8rem",
              }}>✦</span>
              Nova Pergunta
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <FormLabel>Nome interno <Req/></FormLabel>
                <FormInput
                  value={form.campo}
                  onChange={e => setForm({ ...form, campo: e.target.value.replace(/\s/g,"_").toLowerCase() })}
                  placeholder="ex: budget_aprovado"
                />
                <FormHint>Sem espaços. Usado internamente no banco de dados.</FormHint>
              </div>
              <div>
                <FormLabel>Texto exibido ao consultor <Req/></FormLabel>
                <FormInput
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="ex: O budget para a vaga está aprovado?"
                />
              </div>
              <div>
                <FormLabel>Tipo de resposta</FormLabel>
                <FormSelect
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                >
                  {TIPOS.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label} — {t.desc}</option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <FormLabel>Posição (número de ordem)</FormLabel>
                <FormInput
                  type="number"
                  value={form.ordem}
                  onChange={e => setForm({ ...form, ordem: e.target.value })}
                  placeholder="Deixe em branco para colocar no final"
                />
              </div>
              {form.tipo === "select" && (
                <div style={{ gridColumn: "span 2" }}>
                  <FormLabel>Opções da lista <Req/></FormLabel>
                  <FormTextarea
                    value={form.opcoes}
                    onChange={e => setForm({ ...form, opcoes: e.target.value })}
                    placeholder={"Uma opção por linha:\nOpcao 1\nOpcao 2\nOpcao 3"}
                    style={{ minHeight: 90 }}
                  />
                  <FormHint>Cada linha vira uma opção no menu.</FormHint>
                </div>
              )}
              <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                  fontSize: "0.82rem", color: COLORS.creamDim, userSelect: "none",
                }}>
                  <input
                    type="checkbox" checked={form.obrigatorio}
                    onChange={e => setForm({ ...form, obrigatorio: e.target.checked })}
                    style={{ accentColor: COLORS.amber, width: 14, height: 14 }}
                  />
                  Campo obrigatório
                  <span style={{ fontSize: "0.72rem", color: COLORS.amber, marginLeft: 2 }}>
                    (bloqueia avanço se vazio)
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.65rem" }}>
              <button onClick={salvarNova} style={btnPrimary}>
                Salvar Pergunta
              </button>
              <button onClick={() => setAdicionando(false)} style={btnGhost}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista ativas */}
        {carregando ? (
          <div style={{ textAlign: "center", color: COLORS.creamDim, padding: "3rem", fontSize: "0.88rem" }}>
            Carregando perguntas...
          </div>
        ) : (
          <>
            {ativas.length === 0 && !adicionando && (
              <div style={{
                textAlign: "center", padding: "3rem 1rem",
                color: COLORS.creamDim, fontSize: "0.88rem",
                border: `1px dashed ${COLORS.border}`, borderRadius: 14,
              }}>
                Nenhuma pergunta ativa. Clique em <strong style={{ color: COLORS.amber }}>+ Nova Pergunta</strong> para começar.
              </div>
            )}

            {ativas.map((p, idx) => (
              <PerguntaCard
                key={p.id}
                p={p}
                idx={idx}
                totalAtivas={ativas.length}
                editando={editando}
                perguntas={perguntas}
                setPerguntas={setPerguntas}
                setEditando={setEditando}
                salvarEdicao={salvarEdicao}
                desativar={desativar}
                excluirPermanente={excluirPermanente}
                moverOrdem={moverOrdem}
              />
            ))}

            {/* Inativas */}
            {inativas.length > 0 && (
              <details style={{ marginTop: "1.5rem" }}>
                <summary style={{
                  cursor: "pointer",
                  fontSize: "0.72rem", color: COLORS.creamDim,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "0.6rem 0", listStyle: "none",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "rgba(196,187,174,0.3)", display: "inline-block",
                  }} />
                  Perguntas desativadas ({inativas.length})
                </summary>
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {inativas.map(p => (
                    <div key={p.id} style={{
                      background: "rgba(15,40,42,0.4)",
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: 10, padding: "0.75rem 1rem",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: "1rem",
                    }}>
                      <div>
                        <span style={{ color: COLORS.creamDim, fontSize: "0.85rem" }}>{p.label}</span>
                        <span style={{ color: "rgba(196,187,174,0.3)", fontSize: "0.72rem", marginLeft: 8 }}>
                          ({p.campo})
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                        <button onClick={() => reativar(p.id)} style={btnOutlineAmber}>
                          ↩ Reativar
                        </button>
                        <button onClick={() => excluirPermanente(p.id, p.label)} style={btnOutlineError}>
                          🗑 Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Card de pergunta ativa ─────────────────────────────────────────────────
function PerguntaCard({ p, idx, totalAtivas, editando, perguntas, setPerguntas, setEditando, salvarEdicao, desativar, excluirPermanente, moverOrdem }) {
  const isEditing = editando === p.id;
  const tipoInfo  = TIPOS.find(t => t.value === p.tipo) || {};
  const isSondagem = p.campo.startsWith("sondagem_");

  return (
    <div style={{
      background: isEditing ? "rgba(29,77,79,0.35)" : "rgba(15,40,42,0.5)",
      border: `1px solid ${isEditing ? "rgba(212,131,42,0.4)" : COLORS.border}`,
      borderRadius: 14,
      marginBottom: "0.65rem",
      overflow: "hidden",
      transition: "all 0.2s",
      position: "relative",
    }}>
      {/* Indicador lateral */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: isSondagem
          ? `linear-gradient(180deg, rgba(212,131,42,0.4), rgba(212,131,42,0.1))`
          : `linear-gradient(180deg, rgba(42,107,109,0.6), rgba(42,107,109,0.2))`,
        borderRadius: "14px 0 0 14px",
      }} />

      <div style={{ padding: "1rem 1rem 1rem 1.4rem" }}>
        {isEditing ? (
          // ── Modo edição ──────────────────────────────────────────────────
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <FormLabel>Texto da pergunta</FormLabel>
                <FormInput
                  value={p.label}
                  onChange={e => setPerguntas(perguntas.map(x => x.id === p.id ? { ...x, label: e.target.value } : x))}
                />
              </div>
              <div>
                <FormLabel>Tipo</FormLabel>
                <FormSelect
                  value={p.tipo}
                  onChange={e => setPerguntas(perguntas.map(x => x.id === p.id ? { ...x, tipo: e.target.value } : x))}
                >
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </FormSelect>
              </div>
              {p.tipo === "select" && (
                <div style={{ gridColumn: "span 2" }}>
                  <FormLabel>Opções (uma por linha)</FormLabel>
                  <FormTextarea
                    value={Array.isArray(p.opcoes) ? p.opcoes.join("\n") : (p.opcoes || "")}
                    onChange={e => setPerguntas(perguntas.map(x => x.id === p.id ? { ...x, opcoes: e.target.value.split("\n") } : x))}
                    style={{ minHeight: 72 }}
                  />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.82rem", color: COLORS.creamDim, userSelect: "none" }}>
                  <input
                    type="checkbox" checked={p.obrigatorio}
                    onChange={e => setPerguntas(perguntas.map(x => x.id === p.id ? { ...x, obrigatorio: e.target.checked } : x))}
                    style={{ accentColor: COLORS.amber }}
                  />
                  Campo obrigatório
                </label>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.55rem" }}>
              <button onClick={() => salvarEdicao(p.id)} style={btnPrimary}>Salvar</button>
              <button onClick={() => setEditando(null)} style={btnGhost}>Cancelar</button>
            </div>
          </div>
        ) : (
          // ── Modo exibição ─────────────────────────────────────────────────
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Ordem */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: "rgba(42,107,109,0.2)", border: `1px solid ${COLORS.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem", fontWeight: 700, color: COLORS.creamDim,
            }}>
              {p.ordem}
            </div>

            {/* Conteúdo */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 500, color: COLORS.white }}>
                  {p.label}
                </span>
                {p.obrigatorio && (
                  <span style={{
                    fontSize: "0.62rem", color: COLORS.amber,
                    background: "rgba(212,131,42,0.1)",
                    border: "1px solid rgba(212,131,42,0.25)",
                    borderRadius: 100, padding: "1px 7px",
                    fontWeight: 600, letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}>obrigatório</span>
                )}
                {isSondagem && (
                  <span style={{
                    fontSize: "0.62rem", color: "rgba(212,131,42,0.6)",
                    background: "rgba(212,131,42,0.06)",
                    border: "1px solid rgba(212,131,42,0.15)",
                    borderRadius: 100, padding: "1px 7px",
                    letterSpacing: "0.05em", textTransform: "uppercase",
                  }}>sondagem</span>
                )}
              </div>
              <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.72rem", color: COLORS.creamDim }}>
                  {tipoInfo.icon} {tipoInfo.label}
                </span>
                {p.tipo === "select" && Array.isArray(p.opcoes) && p.opcoes.length > 0 && (
                  <span style={{ fontSize: "0.72rem", color: "rgba(196,187,174,0.35)" }}>
                    opções: {p.opcoes.join(", ")}
                  </span>
                )}
                <span style={{ fontSize: "0.68rem", color: "rgba(196,187,174,0.25)", fontFamily: "monospace" }}>
                  {p.campo}
                </span>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
              {/* Setas de ordem */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  onClick={() => moverOrdem(p.id, "up")}
                  disabled={idx === 0}
                  title="Mover para cima"
                  style={btnArrow(idx === 0)}
                >▲</button>
                <button
                  onClick={() => moverOrdem(p.id, "down")}
                  disabled={idx === totalAtivas - 1}
                  title="Mover para baixo"
                  style={btnArrow(idx === totalAtivas - 1)}
                >▼</button>
              </div>

              <button onClick={() => setEditando(p.id)} style={btnIcon} title="Editar">✏️</button>
              <button onClick={() => desativar(p.id, p.label)} style={btnIconWarn} title="Desativar">⊘</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componentes de formulário ─────────────────────────────────────────────

function Req() {
  return <span style={{ color: COLORS.amber, marginLeft: 2 }}>*</span>;
}

function FormLabel({ children }) {
  return (
    <div style={{
      fontSize: "0.67rem", fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.1em", color: "rgba(196,187,174,0.45)",
      marginBottom: "0.4rem",
    }}>
      {children}
    </div>
  );
}

function FormInput({ style: extraStyle, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%", background: "rgba(15,40,42,0.7)",
        border: `1px solid ${COLORS.border}`, borderRadius: 10,
        padding: "0.65rem 0.85rem", color: COLORS.cream,
        fontFamily: "'Outfit', sans-serif", fontSize: "0.88rem",
        outline: "none", boxSizing: "border-box",
        transition: "border-color 0.2s, box-shadow 0.2s",
        ...extraStyle,
      }}
      onFocus={e => { e.target.style.borderColor = COLORS.amber; e.target.style.boxShadow = `0 0 0 3px rgba(212,131,42,0.08)`; }}
      onBlur={e => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = "none"; }}
    />
  );
}

function FormSelect({ children, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: "100%", background: "rgba(15,40,42,0.7)",
        border: `1px solid ${COLORS.border}`, borderRadius: 10,
        padding: "0.65rem 2rem 0.65rem 0.85rem", color: COLORS.cream,
        fontFamily: "'Outfit', sans-serif", fontSize: "0.88rem",
        outline: "none", boxSizing: "border-box", cursor: "pointer",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23D4832A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
      }}
    >
      {children}
    </select>
  );
}

function FormTextarea({ style: extraStyle, ...props }) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%", background: "rgba(15,40,42,0.7)",
        border: `1px solid ${COLORS.border}`, borderRadius: 10,
        padding: "0.65rem 0.85rem", color: COLORS.cream,
        fontFamily: "'Outfit', sans-serif", fontSize: "0.88rem",
        outline: "none", resize: "vertical", boxSizing: "border-box",
        minHeight: 70, lineHeight: 1.6,
        ...extraStyle,
      }}
      onFocus={e => { e.target.style.borderColor = COLORS.amber; }}
      onBlur={e => { e.target.style.borderColor = COLORS.border; }}
    />
  );
}

function FormHint({ children }) {
  return (
    <div style={{ fontSize: "0.7rem", color: "rgba(196,187,174,0.35)", marginTop: 4 }}>
      {children}
    </div>
  );
}

// ── Estilos de botões ─────────────────────────────────────────────────────

const btnPrimary = {
  background: COLORS.amber, color: COLORS.tealDeep,
  border: "none", borderRadius: 9,
  padding: "0.65rem 1.3rem",
  fontWeight: 700, cursor: "pointer",
  fontSize: "0.82rem", fontFamily: "'Outfit', sans-serif",
  letterSpacing: "0.03em",
};

const btnGhost = {
  background: "transparent", color: COLORS.creamDim,
  border: `1px solid ${COLORS.border}`, borderRadius: 9,
  padding: "0.65rem 1.1rem",
  cursor: "pointer", fontSize: "0.82rem",
  fontFamily: "'Outfit', sans-serif",
};

const btnOutlineAmber = {
  background: "rgba(212,131,42,0.08)",
  border: `1px solid rgba(212,131,42,0.3)`,
  borderRadius: 8, padding: "0.45rem 0.85rem",
  color: COLORS.amberLight, cursor: "pointer",
  fontSize: "0.75rem", fontFamily: "'Outfit', sans-serif",
};

const btnOutlineError = {
  background: "rgba(224,119,119,0.08)",
  border: "1px solid rgba(224,119,119,0.25)",
  borderRadius: 8, padding: "0.45rem 0.85rem",
  color: COLORS.error, cursor: "pointer",
  fontSize: "0.75rem", fontFamily: "'Outfit', sans-serif",
};

const btnIcon = {
  background: "rgba(42,107,109,0.2)",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8, width: 32, height: 32,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontSize: "0.85rem",
  transition: "all 0.18s",
};

const btnIconWarn = {
  ...btnIcon,
  background: "rgba(224,119,119,0.06)",
  border: "1px solid rgba(224,119,119,0.2)",
  color: "rgba(224,119,119,0.6)",
};

const btnArrow = (disabled) => ({
  background: "transparent",
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  color: disabled ? "rgba(196,187,174,0.15)" : COLORS.creamDim,
  fontSize: "0.55rem", padding: "1px 3px",
  lineHeight: 1, display: "block",
});