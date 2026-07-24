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

  // Cache das provas anexadas: mesma chave "painelId|simId" -> [arquivos].
  let provasCache = {};
  const MAX_FOTOS_SLOT = 8;              // limite de fotos por campo (evita travar)
  const MAX_BYTES = 30 * 1024 * 1024;    // 30 MB por arquivo

  // Campos de upload por tipo de vestibular — refletem os cadernos de prova reais.
  const SLOTS = {
    ita: [
      ["fase1", "1ª fase"],
      ["fase2_matematica", "2ª fase · Matemática"],
      ["fase2_fisica", "2ª fase · Física"],
      ["fase2_quimica", "2ª fase · Química"],
      ["fase2_portugues", "2ª fase · Português"],
    ],
    unesp: [
      ["fase1", "1ª fase (objetiva)"],
      ["fase2_dia1", "2ª fase · Dia 1"],
      ["fase2_dia2", "2ª fase · Dia 2 (Ling. + Redação)"],
    ],
    fuvest_medicina: [
      ["fase1", "1ª fase"],
      ["fase2_dia1", "2ª fase · Dia 1 (Port. + Redação)"],
      ["fase2_dia2", "2ª fase · Dia 2 (Específicas)"],
    ],
    provao: [
      ["prova", "Prova"],
    ],
  };
  function panelTipo(p) {
    if (p.tipo === "ita") return "ita";
    if (p.tipo === "fuvest_medicina") return "fuvest_medicina";
    if (p.tipo === "provao") return "provao";
    return "unesp"; // painéis UNESP não têm campo tipo
  }

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

  /* ---------- Provas anexadas (Supabase Storage + tabela) ---------- */
  async function carregarProvas() {
    provasCache = {};
    if (!SB) return;
    const { data, error } = await SB.from("provas_anexadas")
      .select("*").order("created_at", { ascending: true });
    if (error || !data) return;
    data.forEach(r => {
      const key = cacheKey(r.painel_id, r.simulado_id);
      (provasCache[key] = provasCache[key] || []).push({
        id: r.id, slot: r.slot, path: r.arquivo_path, nome: r.arquivo_nome, tipo: r.tipo,
      });
    });
  }
  function getProvasSlot(painelId, simId, slot) {
    return (provasCache[cacheKey(painelId, simId)] || []).filter(p => p.slot === slot);
  }
  function tipoDoArquivo(file) {
    const n = (file.name || "").toLowerCase();
    if (file.type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
    if ((file.type || "").indexOf("image/") === 0 || /\.(jpe?g|png|webp|heic|heif)$/.test(n)) return "imagem";
    return null;
  }

  async function subirArquivos(t, slot, fileList) {
    if (!SB) return;
    const { data: u } = await SB.auth.getUser();
    const userId = u && u.user ? u.user.id : null;
    if (!userId) { toast("Faça login para anexar provas."); return; }
    const files = Array.from(fileList);
    for (const file of files) {
      const tipo = tipoDoArquivo(file);
      if (!tipo) { toast("Formato não aceito: use PDF ou imagem."); continue; }
      if (file.size > MAX_BYTES) { toast(`"${file.name}" passa de 30 MB.`); continue; }
      const atuais = getProvasSlot(t.painelId, t.simId, slot);
      if (tipo === "pdf") {
        // Um PDF por campo: remove o(s) anterior(es) antes de subir o novo.
        for (const old of atuais.filter(p => p.tipo === "pdf")) await removerProva(old, t, { silent: true });
      } else if (atuais.filter(p => p.tipo === "imagem").length >= MAX_FOTOS_SLOT) {
        toast(`Máximo de ${MAX_FOTOS_SLOT} fotos por campo.`); continue;
      }
      const safe = (file.name || "arquivo").replace(/[^\w.\-]+/g, "_").slice(-60);
      const path = `${userId}/${t.painelId}/${t.simId}/${slot}/${Date.now()}_${safe}`;
      const { error: upErr } = await SB.storage.from("provas").upload(path, file, { upsert: false });
      if (upErr) { toast("Não foi possível enviar. Tente de novo."); continue; }
      const { data, error } = await SB.from("provas_anexadas").insert({
        user_id: userId, painel_id: t.painelId, simulado_id: t.simId,
        slot, arquivo_path: path, arquivo_nome: file.name || safe, tipo,
      }).select().single();
      if (error || !data) { await SB.storage.from("provas").remove([path]); continue; }
      const key = cacheKey(t.painelId, t.simId);
      (provasCache[key] = provasCache[key] || []).push({
        id: data.id, slot, path, nome: data.arquivo_nome, tipo,
      });
    }
    renderWorkspace();
  }

  async function removerProva(prova, t, opts) {
    opts = opts || {};
    if (SB) {
      await SB.storage.from("provas").remove([prova.path]);
      await SB.from("provas_anexadas").delete().eq("id", prova.id);
    }
    const key = cacheKey(t.painelId, t.simId);
    provasCache[key] = (provasCache[key] || []).filter(p => p.id !== prova.id);
    if (!opts.silent) renderWorkspace();
  }

  async function abrirVisualizador(prova) {
    if (!SB) return;
    const { data, error } = await SB.storage.from("provas").createSignedUrl(prova.path, 3600);
    if (error || !data) { toast("Não foi possível abrir o arquivo."); return; }
    const url = data.signedUrl;
    const win = el("div", { class: "ce-viewer" });
    const bar = el("div", { class: "ce-viewer-bar" });
    bar.appendChild(el("span", { class: "ce-viewer-title" }, esc(prova.nome)));
    const fechar = el("button", { class: "ce-viewer-close" }, "✕");
    fechar.onclick = () => win.remove();
    bar.appendChild(fechar);
    win.appendChild(bar);
    const body = el("div", { class: "ce-viewer-body" });
    if (prova.tipo === "pdf") {
      body.appendChild(el("iframe", { class: "ce-viewer-frame", src: url }));
    } else {
      body.appendChild(el("img", { class: "ce-viewer-img", src: url, alt: esc(prova.nome) }));
    }
    win.appendChild(body);
    document.body.appendChild(win);
    tornarArrastavel(win, bar);
  }

  // Deixa a janela do visualizador arrastável pela barra do topo (mouse e toque).
  function tornarArrastavel(win, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    const ponto = (e) => (e.touches && e.touches[0]) ? e.touches[0] : e;
    const onMove = (e) => {
      if (!dragging) return;
      const p = ponto(e);
      win.style.left = (ox + p.clientX - sx) + "px";
      win.style.top = (oy + p.clientY - sy) + "px";
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
    const onDown = (e) => {
      dragging = true;
      const p = ponto(e);
      const r = win.getBoundingClientRect();
      sx = p.clientX; sy = p.clientY; ox = r.left; oy = r.top;
      win.style.left = ox + "px"; win.style.top = oy + "px";
      win.style.right = "auto"; win.style.bottom = "auto";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);
      e.preventDefault();
    };
    handle.addEventListener("mousedown", onDown);
    handle.addEventListener("touchstart", onDown, { passive: false });
  }

  function toast(msg) {
    const box = el("div", { class: "ce-toast" }, esc(msg));
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3200);
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
          painelId: p.id, simId: s.id, tipo: panelTipo(p),
          painelLabel: panelLabel(p), simLabel: s.titulo,
          label: `${panelLabel(p)} — ${s.titulo}`,
        }));
      } else {
        out.push({
          painelId: p.id, simId: "_painel", tipo: panelTipo(p),
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
    card.appendChild(buildForm(t));

    // Resumo + lista agrupada por status
    const erros = getErros(t.painelId, t.simId);
    if (erros.length) {
      card.appendChild(buildResumo(erros));
      card.appendChild(buildListaAgrupada(t, erros));
    }

    root().appendChild(card);
  }

  function buildForm(t) {
    const wrap = el("div", { class: "ce-grid" });

    // Coluna esquerda: 1ª e 2ª fase empilhadas na mesma vertical.
    const colL = el("div", { class: "ce-col" });
    const boxFase1 = panelBox("1ª Fase — Questões Objetivas");
    const taFase1 = el("textarea", { class: "ce-textarea", placeholder: "Ex: 5, 10, 12, 18" });
    taFase1.value = draft.fase1;
    taFase1.oninput = () => { draft.fase1 = taFase1.value; };
    boxFase1.appendChild(taFase1);
    colL.appendChild(boxFase1);

    const boxFase2 = panelBox("2ª Fase — Questões Discursivas");
    const taFase2 = el("textarea", { class: "ce-textarea", placeholder: "Ex: Errei questão 5-10 por confundir o período" });
    taFase2.value = draft.fase2;
    taFase2.oninput = () => { draft.fase2 = taFase2.value; };
    boxFase2.appendChild(taFase2);
    colL.appendChild(boxFase2);

    // Coluna direita: provas anexadas do simulado selecionado.
    const colR = el("div", { class: "ce-col" });
    colR.appendChild(buildProvasBox(t));

    wrap.append(colL, colR);
    return wrap;
  }

  function panelBox(titulo) {
    const b = el("div", { class: "ce-box" });
    b.appendChild(el("h3", { class: "ce-box-title" }, esc(titulo)));
    return b;
  }

  /* ---------- Coluna "Minhas Provas" ---------- */
  function buildProvasBox(t) {
    const box = el("div", { class: "ce-box ce-provas" });
    box.appendChild(el("h3", { class: "ce-box-title" }, "Minhas Provas"));
    box.appendChild(el("p", { class: "ce-provas-hint" }, "Anexe sua prova ou imagem das questões"));
    (SLOTS[t.tipo] || SLOTS.unesp).forEach(([slot, label]) => box.appendChild(buildSlot(t, slot, label)));
    return box;
  }

  function buildSlot(t, slot, label) {
    const wrap = el("div", { class: "ce-slot" });
    wrap.appendChild(el("div", { class: "ce-slot-lbl" }, esc(label)));

    const arquivos = getProvasSlot(t.painelId, t.simId, slot);
    if (arquivos.length) {
      const lista = el("div", { class: "ce-slot-files" });
      arquivos.forEach(a => lista.appendChild(buildArquivoChip(t, a)));
      wrap.appendChild(lista);
    }

    const temPdf = arquivos.some(a => a.tipo === "pdf");
    const dz = el("label", { class: "ce-drop" });
    const inp = el("input", { type: "file", accept: ".pdf,image/*", multiple: "multiple" });
    inp.style.display = "none";
    inp.onchange = () => { if (inp.files && inp.files.length) subirArquivos(t, slot, inp.files); inp.value = ""; };
    dz.appendChild(inp);
    dz.appendChild(el("span", { class: "ce-drop-ico" }, "＋"));
    dz.appendChild(el("span", { class: "ce-drop-txt" }, temPdf ? "Adicionar foto" : "Anexar ou arrastar"));
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("is-over"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("is-over"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault(); dz.classList.remove("is-over");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) subirArquivos(t, slot, e.dataTransfer.files);
    });
    wrap.appendChild(dz);
    return wrap;
  }

  function buildArquivoChip(t, a) {
    const chip = el("div", { class: "ce-file" });
    chip.appendChild(el("span", { class: "ce-file-ico" }, a.tipo === "pdf" ? "📄" : "🖼️"));
    const nome = el("button", { class: "ce-file-nome", title: "Abrir" }, esc(a.nome));
    nome.onclick = () => abrirVisualizador(a);
    const del = el("button", { class: "ce-file-del", title: "Remover" }, "✕");
    del.onclick = () => removerProva(a, t);
    chip.append(nome, del);
    return chip;
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
    try { await carregarProvas(); } catch (e) { /* provas ficam vazias se falhar */ }
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
    try { await carregarProvas(); } catch (e) { /* provas ficam vazias se falhar */ }
    renderLanding();
  }

  window.NaukaCadernoErros = { mount };
})();
