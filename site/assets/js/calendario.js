/* ============================================================
   NAUKA — CALENDÁRIO
   Eventos pessoais do aluno (Supabase, tabela eventos_calendario,
   RLS por usuário) + datas oficiais de vestibulares/militares
   (hardcoded, não vêm do banco).
   Pode rodar como página avulsa (#cal-root) ou embutido na SPA
   via sidebar (window.NaukaCalendario.mount()).
   ============================================================ */
(function () {
  "use strict";

  const SB = window.NAUKA_SUPABASE || null;

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
  const pad2 = (n) => String(n).padStart(2, "0");
  const dateKey = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

  let embedRoot = null;
  const root = () => embedRoot || document.getElementById("cal-root");

  /* ---------- Datas oficiais (hardcoded) ---------- */
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function range(datas) {
    // Expande um intervalo contíguo de dias em ["YYYY-MM-DD", ...]
    return datas;
  }

  const eventosOficiais = {};
  function addOficial(datas, titulo, tipo) {
    datas.forEach(d => {
      (eventosOficiais[d] = eventosOficiais[d] || []).push({ titulo, tipo });
    });
  }
  // 🎓 Vestibulares públicos (azul)
  addOficial(["2026-10-18"], "Unicamp 1ª Fase", "vestibular");
  addOficial(["2026-11-29", "2026-11-30"], "Unicamp 2ª Fase", "vestibular");
  addOficial(["2026-11-01"], "Fuvest 1ª Fase", "vestibular");
  addOficial(["2026-12-06", "2026-12-07"], "Fuvest 2ª Fase", "vestibular");
  addOficial(["2026-11-08", "2026-11-15"], "Enem", "vestibular");
  addOficial(["2026-11-22"], "Unesp 1ª Fase", "vestibular");
  addOficial(["2026-12-13", "2026-12-14"], "Unesp 2ª Fase", "vestibular");
  // 🪖 Militares (roxo)
  addOficial(["2026-07-25", "2026-07-26"], "EFOMM", "militar");
  addOficial(["2026-08-01", "2026-08-02"], "Colégio Naval", "militar");
  addOficial(["2026-08-29", "2026-08-30"], "Escola Naval", "militar");
  addOficial(["2026-09-13"], "EsPCEx", "militar");
  addOficial(["2026-09-20"], "IME 1ª Fase", "militar");
  addOficial(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"], "IME 2ª Fase", "militar");
  addOficial(["2026-09-27"], "ITA 1ª Fase", "militar");
  addOficial(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"], "ITA 2ª Fase", "militar");
  addOficial(["2026-11-22"], "EEAR", "militar");

  /* ---------- Tipos e cores de evento do aluno ---------- */
  const TIPOS = ["Simulado", "Revisão", "Estudo", "Prova", "Outro"];
  const CORES = [
    ["#E5484D", "Vermelho"], ["#2F6FED", "Azul"], ["#22A06B", "Verde"],
    ["#E8B93B", "Amarelo"], ["#8b5cf6", "Roxo"], ["#E8952E", "Laranja"],
  ];

  /* ---------- Cache dos eventos do aluno (Supabase) ---------- */
  let eventosCache = {}; // "YYYY-MM-DD" -> [{id, titulo, tipo, cor}]

  async function carregarEventos() {
    eventosCache = {};
    if (!SB) return;
    const { data, error } = await SB.from("eventos_calendario")
      .select("*").order("created_at", { ascending: true });
    if (error || !data) return;
    data.forEach(r => {
      const key = r.data;
      (eventosCache[key] = eventosCache[key] || []).push({
        id: r.id, titulo: r.titulo, tipo: r.tipo || "Outro", cor: r.cor || CORES[0][0],
      });
    });
  }

  async function addEvento(dataStr, titulo, tipo, cor) {
    if (!SB) return null;
    const { data: u } = await SB.auth.getUser();
    const userId = u && u.user ? u.user.id : null;
    if (!userId) return null;
    const { data, error } = await SB.from("eventos_calendario")
      .insert({ user_id: userId, data: dataStr, titulo, tipo, cor }).select().single();
    if (error || !data) return null;
    const entry = { id: data.id, titulo: data.titulo, tipo: data.tipo, cor: data.cor };
    (eventosCache[dataStr] = eventosCache[dataStr] || []).push(entry);
    return entry;
  }

  async function editarEvento(id, dataStr, titulo, tipo, cor) {
    if (!SB) return false;
    const { error } = await SB.from("eventos_calendario")
      .update({ titulo, tipo, cor, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return false;
    const entry = (eventosCache[dataStr] || []).find(e => e.id === id);
    if (entry) Object.assign(entry, { titulo, tipo, cor });
    return true;
  }

  async function removerEvento(id, dataStr) {
    if (SB) await SB.from("eventos_calendario").delete().eq("id", id);
    eventosCache[dataStr] = (eventosCache[dataStr] || []).filter(e => e.id !== id);
  }

  /* ---------- Estado da tela ---------- */
  const hoje = new Date();
  let state = {
    viewYear: hoje.getFullYear(),
    viewMonth: hoje.getMonth(), // 0-11
    selected: dateKey(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
  };

  /* ============================================================
     Render
     ============================================================ */
  function render() {
    root().innerHTML = "";
    const card = el("div", { class: "cal-card" });
    const layout = el("div", { class: "cal-layout" });
    layout.appendChild(buildCalendarSide());
    layout.appendChild(buildEventSide());
    card.appendChild(layout);
    root().appendChild(card);
  }

  function buildCalendarSide() {
    const main = el("div", { class: "cal-main" });

    // Topbar: navegação de mês
    const top = el("div", { class: "cal-topbar" });
    const prev = el("button", { class: "cal-nav", type: "button", "aria-label": "Mês anterior" }, "‹");
    const next = el("button", { class: "cal-nav", type: "button", "aria-label": "Próximo mês" }, "›");
    const label = el("div", { class: "cal-monthlabel" },
      `${MESES[state.viewMonth].charAt(0).toUpperCase() + MESES[state.viewMonth].slice(1)} ${state.viewYear}`);
    prev.onclick = () => { mudarMes(-1); };
    next.onclick = () => { mudarMes(1); };
    top.append(prev, label, next);
    main.appendChild(top);

    // Dias da semana
    const weekdays = el("div", { class: "cal-weekdays" });
    DIAS_SEMANA.forEach(d => weekdays.appendChild(el("span", {}, d)));
    main.appendChild(weekdays);

    // Grade de dias
    const grid = el("div", { class: "cal-grid cal-anim" });
    grid.appendChild(buildGrid());
    main.appendChild(grid);

    return main;
  }

  function mudarMes(delta) {
    state.viewMonth += delta;
    if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
    if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
    render();
  }

  function buildGrid() {
    const frag = document.createDocumentFragment();
    const y = state.viewYear, m = state.viewMonth;
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrevMonth = new Date(y, m, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    const hojeKey = dateKey(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstWeekday + 1;
      let cellY = y, cellM = m, cellD = dayNum, outro = false;
      if (dayNum < 1) { cellM = m - 1; cellY = m === 0 ? y - 1 : y; cellD = daysInPrevMonth + dayNum; outro = true; }
      else if (dayNum > daysInMonth) { cellD = dayNum - daysInMonth; cellM = m + 1; cellY = m === 11 ? y + 1 : y; outro = true; }
      if (cellM < 0) cellM = 11; if (cellM > 11) cellM = 0;
      const key = dateKey(cellY, cellM, cellD);

      const oficiais = eventosOficiais[key] || [];
      const tipoOficial = oficiais.length ? oficiais[0].tipo : null;
      const meusEventos = eventosCache[key] || [];

      const cls = ["cal-day"];
      if (outro) cls.push("is-other-month");
      if (key === hojeKey) cls.push("is-today");
      if (key === state.selected) cls.push("is-selected");
      if (tipoOficial === "vestibular") cls.push("is-official-vestibular");
      if (tipoOficial === "militar") cls.push("is-official-militar");

      const btn = el("button", { class: cls.join(" "), type: "button", title: oficiais.map(o => o.titulo).join(", ") });
      btn.appendChild(el("span", { class: "cal-daynum" }, String(cellD)));
      if (meusEventos.length) {
        const dots = el("span", { class: "cal-dots" });
        meusEventos.slice(0, 4).forEach(e => {
          const dot = el("span", { class: "cal-dot" });
          dot.style.background = e.cor;
          dots.appendChild(dot);
        });
        btn.appendChild(dots);
      }
      btn.onclick = () => { state.selected = key; render(); };
      frag.appendChild(btn);
    }
    return frag;
  }

  function buildEventSide() {
    const side = el("div", { class: "cal-side" });
    const inner = el("div", { class: "cal-side-inner" });

    const addBtn = el("button", { class: "btn btn-primary cal-add" }, "+ Adicionar evento");
    addBtn.onclick = () => abrirModal(null);
    side.appendChild(addBtn);

    const list = el("div", { class: "cal-eventlist" });

    const oficiais = eventosOficiais[state.selected] || [];
    oficiais.forEach(o => {
      const card = el("div", { class: `cal-evt cal-evt-oficial is-${o.tipo}` });
      card.appendChild(el("span", { class: "cal-evt-tag" }, o.tipo === "vestibular" ? "Vestibular" : "Militar"));
      card.appendChild(el("span", { class: "cal-evt-titulo" }, esc(o.titulo)));
      list.appendChild(card);
    });

    const meus = eventosCache[state.selected] || [];
    if (!oficiais.length && !meus.length) {
      list.appendChild(el("div", { class: "cal-empty" }, "Nenhum evento neste dia ainda."));
    }
    meus.forEach(e => {
      const card = el("div", { class: "cal-evt" });
      card.style.borderLeftColor = e.cor;
      const info = el("div", { class: "cal-evt-info" });
      info.appendChild(el("span", { class: "cal-evt-tag", style: `background:${e.cor}22;color:${e.cor}` }, esc(e.tipo)));
      info.appendChild(el("span", { class: "cal-evt-titulo" }, esc(e.titulo)));
      card.appendChild(info);
      const editBtn = el("button", { class: "cal-evt-edit", title: "Editar" }, "✎");
      editBtn.onclick = () => abrirModal(e);
      card.appendChild(editBtn);
      list.appendChild(card);
    });

    inner.appendChild(list);
    side.appendChild(inner);
    return side;
  }

  /* ============================================================
     Modal — Adicionar / Editar evento
     ============================================================ */
  function abrirModal(evento) {
    const editando = !!evento;
    const backdrop = el("div", { class: "modal-backdrop" });
    const modal = el("div", { class: "modal cal-modal" });

    const head = el("div", { class: "modal-head" });
    head.appendChild(el("h2", {}, editando ? "Editar Evento" : "Adicionar Evento"));
    const close = el("button", { class: "close-x" }, "✕");
    close.onclick = () => backdrop.remove();
    head.appendChild(close);
    modal.appendChild(head);

    const body = el("div", { class: "modal-body" });

    const fTitulo = el("div", { class: "field" });
    fTitulo.appendChild(el("label", {}, "Título"));
    const inpTitulo = el("input", { class: "input", type: "text", placeholder: "Ex: Simulado Poliedro" });
    inpTitulo.value = editando ? evento.titulo : "";
    fTitulo.appendChild(inpTitulo);
    body.appendChild(fTitulo);

    const fTipo = el("div", { class: "field" });
    fTipo.appendChild(el("label", {}, "Tipo"));
    const selTipo = el("select", { class: "select" });
    TIPOS.forEach(t => {
      const opt = el("option", { value: t }, t);
      if (editando && evento.tipo === t) opt.setAttribute("selected", "selected");
      selTipo.appendChild(opt);
    });
    fTipo.appendChild(selTipo);
    body.appendChild(fTipo);

    const fCor = el("div", { class: "field" });
    fCor.appendChild(el("label", {}, "Cor"));
    const swatches = el("div", { class: "cal-swatches" });
    let corSelecionada = editando ? evento.cor : CORES[0][0];
    CORES.forEach(([hex, nome]) => {
      const sw = el("button", { class: "cal-swatch" + (hex === corSelecionada ? " selected" : ""), type: "button", title: nome });
      sw.style.background = hex;
      sw.onclick = () => {
        corSelecionada = hex;
        [...swatches.children].forEach(c => c.classList.remove("selected"));
        sw.classList.add("selected");
      };
      swatches.appendChild(sw);
    });
    fCor.appendChild(swatches);
    body.appendChild(fCor);

    const errLine = el("div", { class: "error-msg hidden" });
    body.appendChild(errLine);

    modal.appendChild(body);

    const foot = el("div", { class: "modal-foot" });
    if (editando) {
      const delBtn = el("button", { class: "btn btn-ghost cal-del-btn" }, "Deletar");
      delBtn.onclick = async () => {
        if (!confirm(`Remover o evento "${evento.titulo}"?`)) return;
        await removerEvento(evento.id, state.selected);
        backdrop.remove();
        render();
      };
      foot.appendChild(delBtn);
    }
    const salvar = el("button", { class: "btn btn-primary" }, "Salvar");
    salvar.onclick = async () => {
      const titulo = inpTitulo.value.trim();
      if (!titulo) {
        errLine.textContent = "Dê um título ao evento.";
        errLine.classList.remove("hidden");
        return;
      }
      salvar.disabled = true;
      let ok;
      if (editando) {
        ok = await editarEvento(evento.id, state.selected, titulo, selTipo.value, corSelecionada);
      } else {
        ok = await addEvento(state.selected, titulo, selTipo.value, corSelecionada);
      }
      if (!ok) {
        salvar.disabled = false;
        errLine.textContent = "Não foi possível salvar. Tente novamente.";
        errLine.classList.remove("hidden");
        return;
      }
      backdrop.remove();
      render();
    };
    foot.appendChild(salvar);
    modal.appendChild(foot);

    backdrop.appendChild(modal);
    backdrop.onclick = (ev) => { if (ev.target === backdrop) backdrop.remove(); };
    root().appendChild(backdrop);
    inpTitulo.focus();
  }

  /* ---------- Início ---------- */
  async function start() {
    try { await carregarEventos(); } catch (e) { /* mostra vazio se falhar */ }
    render();
  }

  // Só inicializa sozinho quando esta é a página avulsa (existe #cal-root no HTML).
  if (document.getElementById("cal-root")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }

  /* ---------- API para uso embutido na SPA (sidebar) ---------- */
  async function mount(container) {
    embedRoot = container;
    state.selected = dateKey(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    state.viewYear = hoje.getFullYear();
    state.viewMonth = hoje.getMonth();
    try { await carregarEventos(); } catch (e) { /* mostra vazio se falhar */ }
    render();
  }

  window.NaukaCalendario = { mount };
})();
