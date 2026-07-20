/* ============================================================
   NAUKA — CADERNO DE ERROS ESTRATÉGICO
   Página independente (aberta em nova aba a partir de um painel).
   Persistência: cada erro registrado vive na tabela caderno_erros
   do Supabase (RLS por usuário). A LISTA de painéis/simulados ainda
   vem do espelho local (foco_vestibular_v1), escrito pelo app ao logar.
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
  // Converte uma linha do banco no formato que a tela usa.
  function rowToEntry(r) {
    return {
      id: r.id, frente: r.frente,
      fase1: r.fase1 || "", fase2: r.fase2 || "",
      desvios: r.desvios || "", gramatica: r.gramatica || "", discursivas: r.discursivas || "",
      plano: r.plano || "",
      diagnostico: Array.isArray(r.diagnostico) ? r.diagnostico : [],
      frequencia: r.frequencia || "inedito",
      status: r.status || "nao_resolvida",
      criadoEm: new Date(r.criado_em).getTime(),
    };
  }

  // Carrega todos os erros do aluno (uma vez) e agrupa no cache.
  async function carregarErros() {
    errosCache = {};
    if (!SB) return;
    const { data, error } = await SB.from("caderno_erros")
      .select("*").order("criado_em", { ascending: false });
    if (error || !data) return;
    data.forEach(r => {
      const key = cacheKey(r.painel_id, r.sim_id);
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
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  // Raiz de renderização: por padrão a página avulsa (#ce-root); quando embutido na
  // SPA (sidebar), mount() troca para o container fornecido pelo app.js.
  let embedRoot = null;
  const root = () => embedRoot || document.getElementById("ce-root");

  // Rótulo curto de um painel (igual ao do app).
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
        // Painel com coluna Simulado/Ciclo: cada alvo vem só do que o aluno já registrou lá.
        p.simulados.forEach(s => out.push({
          painelId: p.id, simId: s.id,
          painelLabel: panelLabel(p), simLabel: s.titulo,
          label: `${panelLabel(p)} — ${s.titulo}`,
        }));
      } else {
        // Painéis sem esse conceito (ex.: Provão) entram como um alvo único.
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

  // Painel de origem: o que o aluno já tem selecionado, ou o que veio pela URL (?painel=ID).
  function entryPainelId() {
    if (state.painelId) return state.painelId;
    const params = new URLSearchParams(location.search);
    return params.get("painel");
  }
  // O simulado alvo deve vir do painel de origem — nunca da lista de todos os painéis,
  // mesmo quando o painel de origem ainda não tem nenhum simulado/ciclo registrado.
  function targetsForEntry() {
    const pid = entryPainelId();
    const all = allTargets();
    if (!pid) return all;
    return all.filter(t => t.painelId === pid);
  }

  /* ---------- Erros por simulado ---------- */
  function getErros(painelId, simId) {
    return errosCache[cacheKey(painelId, simId)] || [];
  }

  // Insere um novo erro no banco e no cache. Retorna a entrada criada (ou null se falhar).
  async function addErro(painelId, simId, draft, frente) {
    if (!SB) return null;
    const { data: u } = await SB.auth.getUser();
    const userId = u && u.user ? u.user.id : null;
    if (!userId) return null;
    const payload = {
      user_id: userId, painel_id: painelId, sim_id: simId, frente,
      fase1: draft.fase1 || null, fase2: draft.fase2 || null,
      desvios: draft.desvios || null, gramatica: draft.gramatica || null, discursivas: draft.discursivas || null,
      plano: draft.plano || null,
      diagnostico: draft.diagnostico || [],
      frequencia: draft.frequencia || "inedito",
      status: draft.status || "nao_resolvida",
    };
    const { data, error } = await SB.from("caderno_erros").insert(payload).select().single();
    if (error || !data) return null;
    const entry = rowToEntry(data);
    const key = cacheKey(painelId, simId);
    (errosCache[key] = errosCache[key] || []).unshift(entry);
    return entry;
  }

  // Atualiza o status de um erro (objeto do cache) no banco.
  async function setStatus(entry, novoStatus) {
    entry.status = novoStatus;
    if (SB) await SB.from("caderno_erros").update({ status: novoStatus }).eq("id", entry.id);
  }

  // Remove um erro do banco e do cache.
  async function removeErro(id, painelId, simId) {
    if (SB) await SB.from("caderno_erros").delete().eq("id", id);
    const key = cacheKey(painelId, simId);
    errosCache[key] = (errosCache[key] || []).filter(e => e.id !== id);
  }

  /* ---------- Constantes de UI ---------- */
  const DIAGNOSTICOS = [
    ["atencao", "Falta de Atenção"],
    ["teoria", "Falta de Teoria"],
    ["tempo", "Gestão de Tempo"],
    ["pegadinha", "Pegadinha da Banca"],
  ];
  const STATUS = [
    ["nao_resolvida", "Não Resolvida"],
    ["em_revisao", "Em Revisão"],
    ["dominada", "Dominada"],
  ];
  const statusLabel = (v) => (STATUS.find(s => s[0] === v) || STATUS[0])[1];
  const diagLabel = (v) => (DIAGNOSTICOS.find(d => d[0] === v) || ["", v])[1];

  /* ---------- Estado da tela ---------- */
  let state = { painelId: null, simId: null, frente: "escrita" };

  /* ============================================================
     TELA 1 — Landing
     ============================================================ */
  function renderLanding() {
    root().innerHTML = "";
    const card = el("div", { class: "ce-card ce-landing" });
    card.appendChild(el("h1", {}, "Caderno de Erros Estratégico"));
    card.appendChild(el("p", { class: "ce-lead" },
      "Selecione o simulado correspondente para mapear os seus padrões de erros e planejar as suas revisões."));
    const btn = el("button", { class: "btn btn-primary ce-cta" }, "📊&nbsp;&nbsp;Escolha seu simulado");
    btn.onclick = openConfig;
    card.appendChild(btn);
    root().appendChild(card);
  }

  /* ============================================================
     MODAL — Configurar Análise
     ============================================================ */
  function openConfig() {
    const targets = targetsForEntry();
    const backdrop = el("div", { class: "modal-backdrop" });
    const modal = el("div", { class: "modal ce-modal" });

    const head = el("div", { class: "modal-head" });
    head.appendChild(el("h2", {}, "Configurar Análise"));
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

    body.appendChild(el("label", { class: "ce-modal-label" }, "Selecione o Simulado Alvo:"));
    const select = el("select", { class: "select" });
    targets.forEach((t, i) => {
      const opt = el("option", { value: String(i) }, esc(t.label));
      select.appendChild(opt);
    });
    body.appendChild(select);

    body.appendChild(el("p", { class: "ce-modal-q" }, "Para qual frente deseja ir agora?"));
    const irEscrita = el("button", { class: "btn btn-primary btn-block ce-modal-go" }, "Análise da Prova Escrita");
    const irRedacao = el("button", { class: "btn btn-primary btn-block ce-modal-go" }, "Análise de Redação");
    const entrar = (frente) => {
      const t = targets[Number(select.value)];
      state = { painelId: t.painelId, simId: t.simId, frente };
      backdrop.remove();
      renderWorkspace();
    };
    irEscrita.onclick = () => entrar("escrita");
    irRedacao.onclick = () => entrar("redacao");
    body.append(irEscrita, irRedacao);

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

    // Faixa: simulado ativo + trocar
    const bar = el("div", { class: "ce-activebar" });
    bar.appendChild(el("div", {},
      `<span class="ce-activebar-lbl">Simulado Ativo:</span> <strong>${esc(t.label)}</strong>`));
    const trocar = el("button", { class: "btn btn-ghost ce-troca" }, "Trocar Simulado");
    trocar.onclick = openConfig;
    bar.appendChild(trocar);
    card.appendChild(bar);

    // Abas frente
    const tabs = el("div", { class: "ce-tabs" });
    const tEscrita = el("button", { class: "ce-tab" + (state.frente === "escrita" ? " active" : "") }, "Prova Escrita");
    const tRedacao = el("button", { class: "ce-tab" + (state.frente === "redacao" ? " active" : "") }, "Redação");
    tEscrita.onclick = () => { state.frente = "escrita"; renderWorkspace(); };
    tRedacao.onclick = () => { state.frente = "redacao"; renderWorkspace(); };
    tabs.append(tEscrita, tRedacao);
    card.appendChild(tabs);

    // Formulário de novo registro
    card.appendChild(buildForm(t));

    // Lista de erros já registrados
    card.appendChild(buildErrosList(t));

    root().appendChild(card);
  }

  // Rascunho do registro sendo montado
  function novoDraft() {
    return {
      // prova escrita
      fase1: "", fase2: "",
      // redação
      desvios: "", gramatica: "", discursivas: "",
      // comuns
      diagnostico: [], frequencia: "inedito", plano: "", status: "nao_resolvida",
    };
  }

  function buildForm(t) {
    const draft = novoDraft();
    const wrap = el("div", { class: "ce-grid" });

    // ---- Coluna esquerda: campos de texto ----
    const colL = el("div", { class: "ce-col" });
    if (state.frente === "escrita") {
      colL.appendChild(panelBox("1ª Fase — Questões Objetivas",
        "Registre em formato livre os conteúdos e as questões que causaram o erro.",
        textareaFor(draft, "fase1", "Ex: Errei a questão 22 de história por confundir o período do Segundo Reinado. Atenção à leitura do gráfico associado...")));
      colL.appendChild(panelBox("2ª Fase — Questões Discursivas",
        "Insira aqui os pontos de atenção e gargalos das suas respostas dissertativas.",
        textareaFor(draft, "fase2", "Descreva falhas de desenvolvimento, palavras-chave que faltaram ou problemas de espaço na folha de respostas...")));
    } else {
      colL.appendChild(panelBox("Desvios Estruturais e Argumentativos",
        "Gargalos apontados na sua tese, coesão ou introdução do tema.",
        textareaFor(draft, "desvios", "Ex: Tangenciei levemente o tema no segundo parágrafo ou o corretor alegou falta de profundidade no argumento de autoridade...")));
      colL.appendChild(panelBox("Gramática e Repertórios Perdidos",
        "Falhas de norma culta ou propostas de novos repertórios curingas.",
        textareaFor(draft, "gramatica", "Anote regras gramaticais esquecidas (ex: crases, concordância) ou dados estatísticos que enriqueceriam a redação...")));
      colL.appendChild(panelBox("2ª Fase — Questões Discursivas",
        "Insira aqui os pontos de atenção e gargalos das suas respostas dissertativas.",
        textareaFor(draft, "discursivas", "Descreva falhas de desenvolvimento, palavras-chave que faltaram ou problemas de espaço na folha de respostas...")));
    }

    // ---- Coluna direita: diagnóstico + frequência + plano ----
    const colR = el("div", { class: "ce-col" });

    if (state.frente === "escrita") {
      const diagBox = panelBox("Diagnóstico Cognitivo",
        "Qual fator foi o gatilho principal para o erro acontecer? (pode marcar mais de um)");
      const diagGrid = el("div", { class: "ce-diag-grid" });
      DIAGNOSTICOS.forEach(([k, label]) => {
        const b = el("button", { class: `ce-diag-btn is-${k}` }, label);
        b.onclick = () => {
          const i = draft.diagnostico.indexOf(k);
          if (i >= 0) { draft.diagnostico.splice(i, 1); b.classList.remove("selected"); }
          else { draft.diagnostico.push(k); b.classList.add("selected"); }
        };
        diagGrid.appendChild(b);
      });
      diagBox.appendChild(diagGrid);
      colR.appendChild(diagBox);
    }

    // Frequência (única)
    const freqBox = panelBox("Frequência do Erro",
      "Esse tema já costuma derrubar você em outros ciclos?");
    const freqGrid = el("div", { class: "ce-toggle-row" });
    [["inedito", "É um erro inédito"], ["parecido", "Já errei tema parecido"]].forEach(([k, label]) => {
      const b = el("button", { class: "ce-toggle" + (draft.frequencia === k ? " active" : "") }, label);
      b.onclick = () => {
        draft.frequencia = k;
        [...freqGrid.children].forEach(c => c.classList.remove("active"));
        b.classList.add("active");
      };
      freqGrid.appendChild(b);
    });
    freqBox.appendChild(freqGrid);
    colR.appendChild(freqBox);

    // Plano estratégico + termômetro
    const planoBox = panelBox("Plano Estratégico & Status",
      "Ação corretiva imediata para dominar o tópico:");
    planoBox.appendChild(textareaFor(draft, "plano", "Ex: Revisar teoria de óptica geométrica e refazer 5 exercícios da VUNESP."));
    planoBox.appendChild(el("div", { class: "ce-termo-lbl" }, "Termômetro de Evolução:"));
    const termo = el("div", { class: "ce-termo-row" });
    STATUS.forEach(([k, label]) => {
      const b = el("button", { class: `ce-termo is-${k}` + (draft.status === k ? " active" : "") }, label);
      b.onclick = () => {
        draft.status = k;
        [...termo.children].forEach(c => c.classList.remove("active"));
        b.classList.add("active");
      };
      termo.appendChild(b);
    });
    planoBox.appendChild(termo);
    colR.appendChild(planoBox);

    wrap.append(colL, colR);

    // ---- Rodapé: Lili + salvar ----
    const foot = el("div", { class: "ce-form-foot" });
    const lili = el("button", { class: "ce-lili-btn" }, "✨ Pedir socorro para a Lili IA");
    lili.onclick = abrirLili;
    const salvar = el("button", { class: "btn btn-primary ce-salvar" }, "Salvar no caderno");
    salvar.onclick = async () => {
      if (!temConteudo(draft)) {
        salvar.textContent = "Preencha algum campo primeiro";
        setTimeout(() => { salvar.textContent = "Salvar no caderno"; }, 1600);
        return;
      }
      salvar.disabled = true;
      salvar.textContent = "Salvando...";
      const entry = await addErro(t.painelId, t.simId, draft, state.frente);
      if (!entry) {
        salvar.disabled = false;
        salvar.textContent = "Erro ao salvar — tente de novo";
        setTimeout(() => { salvar.textContent = "Salvar no caderno"; }, 1800);
        return;
      }
      renderWorkspace();
    };
    foot.append(lili, salvar);

    const box = el("div");
    box.append(wrap, foot);
    return box;
  }

  function temConteudo(d) {
    const textos = [d.fase1, d.fase2, d.desvios, d.gramatica, d.discursivas, d.plano];
    return textos.some(x => x && x.trim()) || d.diagnostico.length > 0;
  }

  // Card escuro (navy) com título, subtítulo e conteúdo
  function panelBox(titulo, sub, conteudo) {
    const b = el("div", { class: "ce-box" });
    b.appendChild(el("h3", { class: "ce-box-title" }, esc(titulo)));
    if (sub) b.appendChild(el("p", { class: "ce-box-sub" }, esc(sub)));
    if (conteudo) b.appendChild(conteudo);
    return b;
  }

  function textareaFor(draft, campo, placeholder) {
    const ta = el("textarea", { class: "ce-textarea", placeholder });
    ta.value = draft[campo] || "";
    ta.oninput = () => { draft[campo] = ta.value; };
    return ta;
  }

  /* ---------- Lista de erros registrados ---------- */
  function buildErrosList(t) {
    const wrap = el("div", { class: "ce-saved" });
    const erros = getErros(t.painelId, t.simId).filter(e => e.frente === state.frente);

    const head = el("div", { class: "ce-saved-head" });
    head.appendChild(el("h3", {}, `Erros registrados — ${state.frente === "escrita" ? "Prova Escrita" : "Redação"}`));
    head.appendChild(el("span", { class: "ce-saved-count" }, String(erros.length)));
    wrap.appendChild(head);

    if (!erros.length) {
      wrap.appendChild(el("div", { class: "ce-empty" },
        "Nenhum erro registrado ainda nesta frente. Preencha acima e clique em “Salvar no caderno”. 👆"));
      return wrap;
    }

    erros.forEach(e => wrap.appendChild(erroCard(t, e)));
    return wrap;
  }

  function erroCard(t, e) {
    const card = el("div", { class: `ce-erro is-${e.status}` });

    const resumoTexto = state.frente === "escrita"
      ? (e.fase1 || e.fase2 || "")
      : (e.desvios || e.gramatica || e.discursivas || "");

    const top = el("div", { class: "ce-erro-top" });
    top.appendChild(el("span", { class: `ce-erro-status is-${e.status}` }, statusLabel(e.status)));
    if (e.frequencia === "parecido") top.appendChild(el("span", { class: "ce-erro-tag ce-recorrente" }, "Recorrente"));
    (e.diagnostico || []).forEach(d =>
      top.appendChild(el("span", { class: `ce-erro-tag is-${d}` }, diagLabel(d))));
    card.appendChild(top);

    card.appendChild(el("p", { class: "ce-erro-txt" },
      esc(resumoTexto) || "<em>(sem descrição)</em>"));
    if (e.plano && e.plano.trim()) {
      card.appendChild(el("p", { class: "ce-erro-plano" }, `<strong>Plano:</strong> ${esc(e.plano)}`));
    }

    const foot = el("div", { class: "ce-erro-foot" });
    // Avançar status (não_resolvida → em_revisão → dominada → volta)
    const avancar = el("button", { class: "ce-erro-mini" }, "Mudar status ›");
    avancar.onclick = async () => {
      const ordem = STATUS.map(s => s[0]);
      const i = ordem.indexOf(e.status);
      await setStatus(e, ordem[(i + 1) % ordem.length]);
      renderWorkspace();
    };
    const del = el("button", { class: "ce-erro-mini ce-erro-del" }, "Remover");
    del.onclick = async () => {
      await removeErro(e.id, t.painelId, t.simId);
      renderWorkspace();
    };
    foot.append(avancar, del);
    card.appendChild(foot);
    return card;
  }

  /* ---------- Lili ---------- */
  function abrirLili() {
    if (window.NaukaChatbot) {
      window.NaukaChatbot.show();
      const bubble = document.getElementById("chatbot-bubble");
      if (bubble) bubble.click();
    }
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
  // container: elemento onde a tela do caderno deve ser desenhada.
  // painelId: painel atualmente ativo no app — pré-seleciona o simulado dele na Config.
  async function mount(container, painelId) {
    embedRoot = container;
    state = { painelId: painelId || null, simId: null, frente: "escrita" };
    try { await carregarErros(); } catch (e) { /* mostra vazio se falhar */ }
    renderLanding();
  }

  window.NaukaCadernoErros = { mount };
})();
