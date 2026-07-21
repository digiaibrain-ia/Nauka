/* ============================================================
   NAUKA — CADERNO DE ERROS
   Registro simples de erros por simulado: questões objetivas
   (1ª fase), questões discursivas (2ª fase) e um termômetro de
   revisão (NÃO RESOLVIDA / REVISANDO / REVISADA).
   Persistência: tabela caderno_erros do Supabase (RLS por usuário).
   A LISTA de painéis/simulados vem do espelho local
   (foco_vestibular_v1), escrito pelo app ao logar.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "foco_vestibular_v1";
  const SB = window.NAUKA_SUPABASE || null;

  // Cache em memória dos erros: chave "painelId|simId" -> [erros] (mais novo primeiro).
  let errosCache = {};
  const cacheKey = (painelId, simId) => painelId + "|" + simId;

  /* ---------- Painéis (leitura do espelho local) ---------- */
  function db() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function userData() {
    const d = db();
    return (d.data && d.session) ? d.data[d.session] : null;
  }

  /* ---------- Erros (Supabase) ---------- */
  function rowToEntry(r) {
    return {
      id: r.id,
      fase1: r.fase_1 || "", fase2: r.fase_2 || "",
      status: r.status || "nao_resolvida",
      criadoEm: new Date(r.created_at).getTime(),
    };
  }

  async function carregarErros() {
    errosCache = {};
    if (!SB) return;
    const { data, error } = await SB.from("caderno_erros")
      .select("*").order("created_at", { ascending: false });
    if (error || !data) return;
    data.forEach(r => {
      const key = cacheKey(r.painel_id, r.simulado_id);
      (errosCache[key] = errosCache[key] || []).push(rowToEntry(r));
    });
  }

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, html) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "dataset") Object.assign(e.dataset, attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let embedRoot = null;
  const root = () => embedRoot || document.getElementById("ce-root");

  function panelLabel(p) {
    if (p.tipo === "provao") return `${p.universidade} — ${p.area}`;
    if (p.tipo === "ita") return "ITA";
    if (p.tipo === "fuvest_medicina") return `Medicina USP — ${p.campus}`;
    return `${p.curso} — ${p.cidade}`;
  }

  // Lista plana de alvos possíveis: cada simulado de cada painel.
  // Painéis sem simulados (Provão) entram como um alvo único.
  function allTargets() {
    const data = userData();
    if (!data) return [];
    const out = [];
    (data.paineis || []).forEach(p => {
      if (p.simulados) {
        p.simulados.forEach(s => out.push({
          painelId: p.id, simId: s.id,
          painelLabel: panelLabel(p), simLabel: s.titulo,
          label: `${panelLabel(p)} — ${s.titulo}`,
        }));
      } else {
        out.push({
          painelId: p.id, simId: "_painel",
          painelLabel: panelLabel(p), simLabel: "Ciclo atual",
          label: panelLabel(p),
        });
      }
    });
    return out;
  }
  function findTarget(painelId, simId) {
    return allTargets().find(t => t.painelId === painelId && t.simId === simId) || null;
  }
  function targetsForEntry() {
    const pid = state.painelId;
    const all = allTargets();
    if (!pid) return all;
    return all.filter(t => t.painelId === pid);
  }

  /* ---------- Erros por simulado ---------- */
  function getErros(painelId, simId) {
    return errosCache[cacheKey(painelId, simId)] || [];
  }

  async function addErro(painelId, simId, fase1, fase2, status) {
    if (!SB) return null;
    const { data: u } = await SB.auth.getUser();
    const userId = u && u.user ? u.user.id : null;
    if (!userId) return null;
    const payload = {
      user_id: userId, painel_id: painelId, simulado_id: simId,
      fase_1: fase1 || null, fase_2: fase2 || null,
      status: status || "nao_resolvida",
    };
    const { data, error } = await SB.from("caderno_erros").insert(payload).select().single();
    if (error || !data) return null;
    const entry = rowToEntry(data);
    const key = cacheKey(painelId, simId);
    (errosCache[key] = errosCache[key] || []).unshift(entry);
    return entry;
  }

  async function setStatus(entry, novoStatus) {
    entry.status = novoStatus;
    if (SB) await SB.from("caderno_erros").update({ status: novoStatus }).eq("id", entry.id);
  }

  async function removeErro(id, painelId, simId) {
    if (SB) await SB.from("caderno_erros").delete().eq("id", id);
    const key = cacheKey(painelId, simId);
    errosCache[key] = (errosCache[key] || []).filter(e => e.id !== id);
  }

  /* ---------- Termômetro de status ---------- */
  const STATUS = [
    ["nao_resolvida", "Não Resolvida"],
    ["revisando", "Revisando"],
    ["revisada", "Revisada"],
  ];
  const statusLabel = (v) => (STATUS.find(s => s[0] === v) || STATUS[0])[1];

  /* ---------- Priorização (questões repetidas primeiro) ---------- */
  function parseNumeros(str) {
    if (!str) return [];
    const out = [];
    (String(str).match(/\d+/g) || []).forEach(n => out.push(Number(n)));
    return out;
  }
  function ordenarPorPrioridade(erros) {
    const contagem = {};
    erros.forEach(e => {
      parseNumeros(e.fase1).forEach(n => { contagem[n] = (contagem[n] || 0) + 1; });
    });
    const repeticoesDe = (e) => {
      const nums = parseNumeros(e.fase1);
      let max = 0;
      nums.forEach(n => { if (contagem[n] > max) max = contagem[n]; });
      return max;
    };
    return erros
      .map((e, i) => ({ e, i, rep: repeticoesDe(e) }))
      .sort((a, b) => (b.rep - a.rep) || (a.i - b.i))
      .map(x => x.e);
  }

  /* ---------- Estado da tela ---------- */
  let state = { painelId: null, simId: null };
  let draft = { fase1: "", fase2: "", status: "nao_resolvida" };

  /* ============================================================
     TELA 1 — Landing (escolha de simulado)
     ============================================================ */
  function renderLanding() {
    root().innerHTML = "";
    const card = el("div", { class: "ce-card ce-landing" });
    card.appendChild(el("h1", {}, "Caderno de Erros"));
    card.appendChild(el("p", { class: "ce-lead" },
      "Selecione o simulado correspondente para registrar os erros e acompanhar a revisão."));
    const btn = el("button", { class: "btn btn-primary ce-cta" }, "📓&nbsp;&nbsp;Escolher simulado");
    btn.onclick = openConfig;
    card.appendChild(btn);
    root().appendChild(card);
  }

  function openConfig() {
    const targets = targetsForEntry();
    const backdrop = el("div", { class: "modal-backdrop" });
    const modal = el("div", { class: "modal ce-modal" });

    const head = el("div", { class: "modal-head" });
    head.appendChild(el("h2", {}, "Escolher Simulado"));
    const close = el("button", { class: "close-x" }, "✕");
    close.onclick = () => backdrop.remove();
    head.appendChild(close);
    modal.appendChild(head);

    const body = el("div", { class: "modal-body" });

    if (!targets.length) {
      body.appendChild(el("p", { class: "ce-lead" },
        "Você ainda não tem simulados registrados. Volte ao painel, adicione um ciclo/simulado e retorne aqui."));
      modal.appendChild(body);
      backdrop.appendChild(modal);
      backdrop.onclick = (ev) => { if (ev.target === backdrop) backdrop.remove(); };
      root().appendChild(backdrop);
      return;
    }

    body.appendChild(el("label", { class: "ce-modal-label" }, "Simulado:"));
    const select = el("select", { class: "select" });
    targets.forEach((t, i) => select.appendChild(el("option", { value: String(i) }, esc(t.label))));
    body.appendChild(select);

    const entrar = el("button", { class: "btn btn-primary btn-block ce-modal-go" }, "Continuar");
    const confirmar = () => {
      const t = targets[Number(select.value)];
      state = { painelId: t.painelId, simId: t.simId };
      draft = { fase1: "", fase2: "", status: "nao_resolvida" };
      backdrop.remove();
      renderWorkspace();
    };
    entrar.onclick = confirmar;
    select.onkeydown = (ev) => { if (ev.key === "Enter") { ev.preventDefault(); confirmar(); } };
    body.appendChild(entrar);

    modal.appendChild(body);
    backdrop.appendChild(modal);
    backdrop.onclick = (ev) => { if (ev.target === backdrop) backdrop.remove(); };
    root().appendChild(backdrop);
  }

  /* ============================================================
     TELA 2 — Workspace
     ============================================================ */
  function renderWorkspace() {
    root().innerHTML = "";
    const t = findTarget(state.painelId, state.simId);
    if (!t) { renderLanding(); return; }

    const card = el("div", { class: "ce-card ce-workspace" });

    // Cabeçalho: simulado ativo + trocar + salvar
    const head = el("div", { class: "ce-head" });
    const headInfo = el("div", {},
      `<span class="ce-activebar-lbl">Simulado:</span> <strong>${esc(t.label)}</strong>`);
    head.appendChild(headInfo);
    const headBtns = el("div", { class: "ce-head-btns" });
    const trocar = el("button", { class: "btn btn-ghost ce-troca" }, "Trocar Simulado");
    trocar.onclick = openConfig;
    const salvar = el("button", { class: "btn btn-primary ce-salvar" }, "Salvar no Caderno");
    salvar.onclick = async () => {
      if (!draft.fase1.trim() && !draft.fase2.trim()) {
        salvar.textContent = "Preencha algum campo primeiro";
        setTimeout(() => { salvar.textContent = "Salvar no Caderno"; }, 1600);
        return;
      }
      salvar.disabled = true;
      salvar.textContent = "Salvando...";
      const entry = await addErro(t.painelId, t.simId, draft.fase1, draft.fase2, draft.status);
      if (!entry) {
        salvar.disabled = false;
        salvar.textContent = "Erro ao salvar — tente de novo";
        setTimeout(() => { salvar.textContent = "Salvar no Caderno"; }, 1800);
        return;
      }
      draft = { fase1: "", fase2: "", status: "nao_resolvida" };
      renderWorkspace();
    };
    headBtns.append(trocar, salvar);
    head.appendChild(headBtns);
    card.appendChild(head);

    // Formulário de novo registro
    card.appendChild(buildForm());

    // Resumo + lista agrupada por status
    const erros = getErros(t.painelId, t.simId);
    if (erros.length) {
      card.appendChild(buildResumo(erros));
      card.appendChild(buildListaAgrupada(t, erros));
    }

    root().appendChild(card);
  }

  function buildForm() {
    const wrap = el("div", { class: "ce-grid" });

    const colL = el("div", { class: "ce-col" });
    const boxFase1 = panelBox("1ª Fase — Questões Objetivas");
    const taFase1 = el("textarea", { class: "ce-textarea", placeholder: "Ex: 5, 10, 12, 18" });
    taFase1.value = draft.fase1;
    taFase1.oninput = () => { draft.fase1 = taFase1.value; };
    boxFase1.appendChild(taFase1);
    colL.appendChild(boxFase1);

    const colR = el("div", { class: "ce-col" });
    const boxFase2 = panelBox("2ª Fase — Questões Discursivas");
    const taFase2 = el("textarea", { class: "ce-textarea", placeholder: "Ex: Errei questão 5-10 por confundir o período" });
    taFase2.value = draft.fase2;
    taFase2.oninput = () => { draft.fase2 = taFase2.value; };
    boxFase2.appendChild(taFase2);
    colR.appendChild(boxFase2);

    wrap.append(colL, colR);
    return wrap;
  }

  function panelBox(titulo) {
    const b = el("div", { class: "ce-box" });
    b.appendChild(el("h3", { class: "ce-box-title" }, esc(titulo)));
    return b;
  }

  /* ---------- Resumo visual ---------- */
  function buildResumo(erros) {
    const porStatus = { nao_resolvida: 0, revisando: 0, revisada: 0 };
    erros.forEach(e => { porStatus[e.status] = (porStatus[e.status] || 0) + 1; });
    const partes = STATUS
      .filter(([k]) => porStatus[k] > 0)
      .map(([k, label]) => `${porStatus[k]} ${label.toUpperCase()}${porStatus[k] > 1 ? "S" : ""}`);
    const texto = `✓ ${erros.length} ERRO${erros.length > 1 ? "S" : ""} REGISTRADO${erros.length > 1 ? "S" : ""}: ${partes.join(", ")}`;
    return el("div", { class: "ce-resumo" }, esc(texto));
  }

  // Título da tarefa de revisão a partir do conteúdo específico do erro.
  function tituloRevisao(t, e) {
    if (e.fase1 && e.fase1.trim()) return `Revisão de erros - Questão ${e.fase1.trim()}`;
    if (e.fase2 && e.fase2.trim()) return `Revisão de erros - ${e.fase2.trim().slice(0, 60)}`;
    return `Revisão de erros - ${t.label}`;
  }

  function abrirModalAgendar(t, e) {
    const backdrop = el("div", { class: "modal-backdrop" });
    const modal = el("div", { class: "modal ce-modal" });

    const head = el("div", { class: "modal-head" });
    head.appendChild(el("h2", {}, "Agendar Revisão"));
    const close = el("button", { class: "close-x" }, "✕");
    close.onclick = () => backdrop.remove();
    head.appendChild(close);
    modal.appendChild(head);

    const body = el("div", { class: "modal-body" });
    body.appendChild(el("label", { class: "ce-modal-label" }, "Data da revisão:"));
    const hoje = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const hojeStr = `${hoje.getFullYear()}-${pad2(hoje.getMonth() + 1)}-${pad2(hoje.getDate())}`;
    const inpData = el("input", { class: "input", type: "date" });
    inpData.value = hojeStr;
    body.appendChild(inpData);

    const errLine = el("div", { class: "error-msg hidden" });
    body.appendChild(errLine);
    modal.appendChild(body);

    const foot = el("div", { class: "modal-foot" });
    const salvar = el("button", { class: "btn btn-primary" }, "Agendar");
    salvar.onclick = async () => {
      if (!SB) { backdrop.remove(); return; }
      const { data: u } = await SB.auth.getUser();
      const userId = u && u.user ? u.user.id : null;
      if (!userId) { backdrop.remove(); return; }
      salvar.disabled = true;
      const titulo = tituloRevisao(t, e);
      const { error } = await SB.from("eventos_calendario").insert({
        user_id: userId, data: inpData.value, titulo, tipo: "Revisão", cor: "#ffaa00",
      });
      if (error) {
        salvar.disabled = false;
        errLine.textContent = "Não foi possível agendar. Tente novamente.";
        errLine.classList.remove("hidden");
        return;
      }
      backdrop.remove();
    };
    foot.appendChild(salvar);
    modal.appendChild(foot);

    backdrop.appendChild(modal);
    backdrop.onclick = (ev) => { if (ev.target === backdrop) backdrop.remove(); };
    root().appendChild(backdrop);
  }

  /* ---------- Lista agrupada por status ---------- */
  function buildListaAgrupada(t, erros) {
    const wrap = el("div", { class: "ce-saved" });
    STATUS.forEach(([k, label]) => {
      const doGrupo = ordenarPorPrioridade(erros.filter(e => e.status === k));
      if (!doGrupo.length) return;
      wrap.appendChild(el("h4", { class: `ce-grupo-lbl is-${k}` }, label.toUpperCase()));
      const grid = el("div", { class: "ce-grid-cards" });
      doGrupo.forEach(e => grid.appendChild(erroCard(t, e)));
      wrap.appendChild(grid);
    });
    return wrap;
  }

  function erroCard(t, e) {
    const card = el("div", { class: `ce-erro is-${e.status}` });

    const titulo = e.fase1 ? `Questão ${e.fase1}` : (e.fase2 ? e.fase2.slice(0, 40) : "Erro registrado");
    card.appendChild(el("div", { class: "ce-erro-num" }, esc(titulo)));

    const badges = el("div", { class: "ce-erro-badges" });
    badges.appendChild(el("span", { class: `ce-erro-status is-${e.status}` }, statusLabel(e.status).toUpperCase()));
    if (e.fase1 && e.fase1.trim()) badges.appendChild(el("span", { class: "ce-erro-origem" }, "1ª FASE"));
    if (e.fase2 && e.fase2.trim()) badges.appendChild(el("span", { class: "ce-erro-origem" }, "2ª FASE"));
    card.appendChild(badges);

    if (e.fase2 && e.fase2.trim()) {
      card.appendChild(el("p", { class: "ce-erro-txt" }, esc(e.fase2)));
    }

    const foot = el("div", { class: "ce-erro-foot" });
    const avancar = el("button", { class: "ce-erro-mini" }, "Mudar status ›");
    avancar.onclick = async () => {
      const ordem = STATUS.map(s => s[0]);
      const i = ordem.indexOf(e.status);
      await setStatus(e, ordem[(i + 1) % ordem.length]);
      renderWorkspace();
    };
    const agendar = el("button", { class: "ce-erro-mini" }, "🗓️ Agendar revisão");
    agendar.onclick = () => abrirModalAgendar(t, e);
    const del = el("button", { class: "ce-erro-mini ce-erro-del" }, "Remover");
    del.onclick = async () => {
      await removeErro(e.id, t.painelId, t.simId);
      renderWorkspace();
    };
    foot.append(avancar, agendar, del);
    card.appendChild(foot);
    return card;
  }

  /* ---------- Início ---------- */
  async function start() {
    if (!userData()) {
      root().innerHTML = "";
      const card = el("div", { class: "ce-card ce-landing" });
      card.appendChild(el("h1", {}, "Faça login primeiro"));
      card.appendChild(el("p", { class: "ce-lead" },
        "O Caderno de Erros usa os seus painéis. Entre na plataforma e abra o caderno a partir de um painel."));
      root().appendChild(card);
      return;
    }
    try { await carregarErros(); } catch (e) { /* mostra vazio se falhar */ }
    renderLanding();
  }

  // Só inicializa sozinho quando esta é a página avulsa (existe #ce-root no HTML).
  // Dentro da SPA (sidebar → Caderno de Erros), quem chama é mount(), abaixo.
  if (document.getElementById("ce-root")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }

  /* ---------- API para uso embutido na SPA (sidebar) ---------- */
  async function mount(container, painelId) {
    embedRoot = container;
    state = { painelId: painelId || null, simId: null };
    draft = { fase1: "", fase2: "", status: "nao_resolvida" };
    try { await carregarErros(); } catch (e) { /* mostra vazio se falhar */ }
    renderLanding();
  }

  window.NaukaCadernoErros = { mount };
})();
