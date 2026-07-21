/* ============================================================
   FOCO VESTIBULAR — Lógica da aplicação
   Depende de: data.js (window.UNESP_DB) e Chart.js (CDN)
   Persistência: localStorage (MVP). Migrar p/ backend ao publicar.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Constantes de cálculo (regras da planilha) ---------- */
  const ESCALA_F1 = 90;     // acertos máximos da 1ª fase
  const META_REDACAO = 24;  // referencial fixo da planilha
  const META_FINAL = 50;    // média final alvo (referencial fixo)
  const QUESTION_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#1b1f28"><circle cx="12" cy="12" r="11"/><text x="12" y="16" font-size="16" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">?</text></svg>';
  const EYE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3.2"/></svg>';
  const EYE_OFF_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.15 4.15M6.6 6.6C3.4 8.6 1.5 12 1.5 12s3.5 7 10.5 7a10.7 10.7 0 0 0 4.2-.85"/><path d="M9.5 9.6a3.2 3.2 0 0 0 4.9 4.1"/></svg>';

  /* ---------- Ícones da sidebar (stroke = currentColor, herdam a cor do item) ---------- */
  const ICON_INICIO = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9"/></svg>';
  const ICON_ANALISE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/></svg>';
  const ICON_CADERNO = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h11a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V4a.5.5 0 0 1 .5-.5Z"/><path d="M6 17h12"/><path d="M9 7h6M9 10.5h6"/></svg>';
  const ICON_CONFIG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3l-1.9 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4-1.9-1.5Z"/></svg>';
  const ICON_CALENDARIO = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
  const ICON_PERFIL = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>';

  /* ============================================================
     1) ARMAZENAMENTO (localStorage)
     ============================================================ */
  const KEY = "foco_vestibular_v1";
  const Store = {
    _read() {
      try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
      catch (e) { return {}; }
    },
    _write(db) { localStorage.setItem(KEY, JSON.stringify(db)); },
    _base() {
      const db = this._read();
      if (!db.users) db.users = {};
      if (!db.data) db.data = {};
      if (!("session" in db)) db.session = null;
      return db;
    },
    getSession() { return this._base().session; },
    findUser(id) { return id ? (this._base().users[id] || null) : null; },
    // Espelha localmente o usuário autenticado no Supabase (sem guardar senha —
    // login/senha ficam no back-end). Mantém a estrutura que o Caderno de Erros já lê.
    syncUser(id, nome, email) {
      const db = this._base();
      db.users[id] = { nome, email };
      if (!db.data[id]) db.data[id] = { perfil: { notas: "" }, paineis: [], ativo: null };
      db.session = id;
      this._write(db);
    },
    userData() {
      const db = this._base();
      return db.data[db.session] || null;
    },
    saveUserData(data) {
      const db = this._base();
      db.data[db.session] = data;
      this._write(db);
    },
    logout() { const db = this._base(); db.session = null; this._write(db); },
  };

  /* ============================================================
     1b) AUTENTICAÇÃO (Supabase)
     Login/senha são gerenciados pelo Supabase Auth. Aqui a gente só:
       - descobre quem está logado (getSession)
       - espelha o usuário no Store local (pra tela e o Caderno de Erros)
       - traduz mensagens de erro para PT-BR
     ============================================================ */
  const SB = window.NAUKA_SUPABASE || null;

  // Puxa o nome do perfil (tabela profiles) e espelha o usuário no Store local.
  async function adotarUsuario(user) {
    let nome = (user.user_metadata && user.user_metadata.nome) || "";
    try {
      const { data } = await SB.from("profiles").select("nome").eq("id", user.id).single();
      if (data && data.nome) nome = data.nome;
    } catch (e) { /* offline ou perfil ainda não criado: usa o metadata */ }
    Store.syncUser(user.id, nome || user.email, user.email);
    await carregarPaineis(user.id);
  }

  // Busca no banco os painéis (UNESP + Provão) do aluno e monta o formato que a tela usa.
  // O cadernoErros ainda não vive no banco (etapa futura): preserva o que já estava local.
  async function carregarPaineis(userId) {
    if (!SB) return;
    const dbAntes = Store._base();
    const anterior = (dbAntes.data[userId] && dbAntes.data[userId].paineis) || [];
    const cadernoPorPainel = {};
    anterior.forEach(p => { if (p.cadernoErros) cadernoPorPainel[p.id] = p.cadernoErros; });

    try {
      const [{ data: pu, error: eu }, { data: pp, error: ep }, { data: pi, error: ei }, { data: pf, error: ef }] = await Promise.all([
        SB.from("paineis_unesp").select("*, simulados_unesp(*)").eq("user_id", userId),
        SB.from("paineis_provao_paulista").select("*").eq("user_id", userId),
        SB.from("paineis_ita").select("*, simulados_ita(*)").eq("user_id", userId),
        SB.from("paineis_fuvest_medicina").select("*, simulados_fuvest_medicina(*)").eq("user_id", userId),
      ]);
      if (eu) throw eu;
      if (ep) throw ep;
      if (ei) throw ei;
      if (ef) throw ef;

      const paineisUnesp = (pu || [])
        .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        .map(row => ({
          id: row.id, faculdade: "UNESP",
          cursoId: row.curso_id, curso: row.curso, cidade: row.cidade,
          periodo: row.periodo, rotulo: row.rotulo, modalidade: row.modalidade,
          metaObjetiva: Number(row.meta_objetiva),
          metaRedacao: row.meta_redacao != null ? Number(row.meta_redacao) : undefined,
          simulados: (row.simulados_unesp || [])
            .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
            .map(s => ({
              id: s.id, titulo: s.titulo, acertos: Number(s.acertos), hum: Number(s.hum),
              nat: Number(s.nat), ling: Number(s.ling), red: Number(s.red),
            })),
          cadernoErros: cadernoPorPainel[row.id] || {},
        }));

      const paineisProvao = (pp || [])
        .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        .map(row => ({
          id: row.id, tipo: "provao",
          universidade: row.universidade, area: row.area,
          notas: {
            s1: row.nota_s1 != null ? Number(row.nota_s1) : null,
            s2: row.nota_s2 != null ? Number(row.nota_s2) : null,
            s3: {
              ling: row.s3_ling != null ? Number(row.s3_ling) : null,
              mat: row.s3_mat != null ? Number(row.s3_mat) : null,
              cn: row.s3_cn != null ? Number(row.s3_cn) : null,
              ch: row.s3_ch != null ? Number(row.s3_ch) : null,
              red: row.s3_red != null ? Number(row.s3_red) : null,
            },
          },
        }));

      const paineisIta = (pi || [])
        .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        .map(row => ({
          id: row.id, tipo: "ita",
          simulados: (row.simulados_ita || [])
            .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
            .map(s => ({
              id: s.id, titulo: s.titulo,
              matF1: Number(s.mat_f1), fisF1: Number(s.fis_f1), quiF1: Number(s.qui_f1), ingF1: Number(s.ing_f1),
              matF2: Number(s.mat_f2), fisF2: Number(s.fis_f2), quiF2: Number(s.qui_f2),
              portObj: Number(s.port_obj), redacao: Number(s.redacao),
            })),
        }));

      const paineisFuvestMed = (pf || [])
        .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        .map(row => ({
          id: row.id, tipo: "fuvest_medicina",
          campus: row.campus, modalidade: row.modalidade,
          metaObjetiva: row.meta_objetiva != null ? Number(row.meta_objetiva) : 0,
          metaRedacao: row.meta_redacao != null ? Number(row.meta_redacao) : 0,
          metaSegundaFase: Number(row.meta_segunda_fase),
          simulados: (row.simulados_fuvest_medicina || [])
            .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
            .map(s => ({
              id: s.id, titulo: s.titulo, acertos: Number(s.acertos),
              portugues: Number(s.portugues), redacao: Number(s.redacao),
              d2: Number(s.d2),
            })),
        }));

      const paineis = [...paineisUnesp, ...paineisProvao, ...paineisIta, ...paineisFuvestMed];
      const dbAgora = Store._base();
      const dataAtual = dbAgora.data[userId] || { perfil: { notas: "" }, paineis: [], ativo: null };
      const aindaExiste = dataAtual.ativo && paineis.some(p => p.id === dataAtual.ativo);
      dataAtual.paineis = paineis;
      dataAtual.ativo = aindaExiste ? dataAtual.ativo : (paineis[0] ? paineis[0].id : null);
      dbAgora.data[userId] = dataAtual;
      Store._write(dbAgora);
    } catch (e) {
      console.error("[Nauka] Não foi possível carregar os painéis do servidor.", e);
    }
  }

  // Traduz as mensagens de erro mais comuns do Supabase para PT-BR.
  function traduzErro(error) {
    const m = (error && error.message || "").toLowerCase();
    if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
    if (m.includes("already registered") || m.includes("already been registered"))
      return "Já existe uma conta com este e-mail. Tente entrar.";
    if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
    if (m.includes("at least 6")) return "A senha deve ter ao menos 6 caracteres.";
    if (m.includes("unable to validate email") || m.includes("invalid email"))
      return "E-mail inválido.";
    return (error && error.message) || "Ocorreu um erro. Tente novamente.";
  }

  // Aplica as preferências salvas (tema, fonte, contraste) assim que o site abre.
  function aplicarConfiguracoesSalvas() {
    applyTheme(getOrInitSetting("theme", "auto"));
    applyFontSize(getOrInitSetting("fontSize", "normal"));
    applyContrast(getOrInitSetting("highContrast", "false") === "true");
  }

  // Na abertura do site: se já houver sessão ativa no Supabase, entra direto.
  async function boot() {
    aplicarConfiguracoesSalvas();
    if (!SB) {
      console.error("[Nauka] Conexão com o Supabase indisponível — verifique supabase-config.js.");
      render();
      return;
    }
    try {
      const { data } = await SB.auth.getSession();
      if (data && data.session && data.session.user) {
        await adotarUsuario(data.session.user);
      }
    } catch (e) { /* segue para a landing/onboarding */ }
    render();
  }

  /* ============================================================
     1c) CONFIGURAÇÕES — funções auxiliares
     ============================================================ */
  const SETTINGS_KEY = "nauka_settings_v1";

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function getOrInitSetting(key, defaultValue) {
    const s = getSettings();
    return s[key] != null ? s[key] : defaultValue;
  }

  function saveOrUpdateSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "light") root.style.colorScheme = "light";
    else if (theme === "dark") root.style.colorScheme = "dark";
    else root.style.colorScheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // O CSS do site usa tamanhos fixos em px (não em rem), então mudar o font-size
  // da raiz não tem efeito algum nos elementos. Usamos "zoom" para escalar a
  // página inteira de verdade (funciona em navegadores Chromium/Edge).
  function applyFontSize(size) {
    const root = document.documentElement;
    const zooms = { pequena: "0.875", normal: "1", grande: "1.125", "muito-grande": "1.25" };
    root.style.zoom = zooms[size] || "1";
  }

  function applyContrast(high) {
    const root = document.documentElement;
    if (high) root.classList.add("high-contrast");
    else root.classList.remove("high-contrast");
  }


  async function deletarContaUsuario() {
    const userId = Store.getSession();
    if (!userId || !SB) { alert("Erro: usuário não identificado."); return; }
    try {
      const { error } = await SB.auth.admin.deleteUser(userId);
      if (error) throw error;
      alert("Conta deletada com sucesso.");
      Store.logout();
      render();
    } catch (e) {
      alert("Erro ao deletar conta. Tente novamente ou contate o suporte.");
      console.error(e);
    }
  }

  /* ============================================================
     2) MOTOR DE CÁLCULO
     ============================================================ */
  function notaF1(acertos) { return (Number(acertos) * 100) / ESCALA_F1; }
  function notaF2(s) {
    return Number(s.hum) + Number(s.nat) + Number(s.ling) + Number(s.red);
  }
  function mediaFinal(s) { return (notaF1(s.acertos) + notaF2(s)) / 2; }
  function dentroDaMeta(s) { return mediaFinal(s) >= META_FINAL; }
  const r1 = (n) => (Math.round(n * 10) / 10).toLocaleString("pt-BR");

  /* ============================================================
     3) HELPERS de DOM
     ============================================================ */
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

  const root = () => document.getElementById("app");

  // Rótulo curto de um painel (funciona p/ vestibular próprio e Provão)
  function panelLabel(p) {
    if (p.tipo === "provao") return `${p.universidade} — ${p.area}`;
    if (p.tipo === "ita") return "ITA";
    if (p.tipo === "fuvest_medicina") return `Medicina USP — ${p.campus}`;
    return `${p.curso} — ${p.cidade}`;
  }

  /* ============================================================
     4) DADOS DE CURSOS (do PDF)
     ============================================================ */
  const CURSOS = (window.UNESP_DB && window.UNESP_DB.cursos || []).filter(c => !c.especial);
  function cursosUnicos() {
    return [...new Set(CURSOS.map(c => c.curso))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }
  function cidadesDoCurso(curso) {
    return [...new Set(CURSOS.filter(c => c.curso === curso).map(c => c.cidade))];
  }
  function entradasDe(curso, cidade) {
    return CURSOS.filter(c => c.curso === curso && c.cidade === cidade);
  }
  // Nota de corte oficial do curso/modalidade do painel — independe da meta pessoal editável.
  function unespCorteOficial(p) {
    const c = CURSOS.find(x => x.id === p.cursoId);
    return c ? c.notas_corte[p.modalidade] : null;
  }

  /* ============================================================
     4b) PROVÃO PAULISTA — dados e motor de cálculo
     Fonte: manual_tecnico_provao_paulista.pdf
     ============================================================ */
  const PDB = window.PROVAO_DB || {};

  function provPesos(uni, area) {
    return (PDB.pesos[uni] && PDB.pesos[uni][area]) || null;
  }
  function isEstadual(uni) { return (PDB.regras.estaduais || []).includes(uni); }

  // Nota geral (1ª/2ª série) 0–90 acertos → escala 0–100
  function provNotaGeral(acertos) {
    if (acertos == null || acertos === "") return null;
    return (Number(acertos) * 100) / PDB.escalaGeral;
  }

  // Objetiva da 3ª série (Nota_3_Obj), em 0–40 pontos. Aceita valores crus (string/número).
  //   %area = acertos / máx da área;  Num = Σ(%area × Peso);  Den = Σ Pesos
  //   Nota_3_Obj = (Num / Den) × 40
  function calcNota3Obj(uni, area, s3) {
    const pesos = provPesos(uni, area);
    const max = PDB.maxAcertos;
    if (!pesos || !s3) return null;
    const areas = ["ling", "mat", "cn", "ch"];
    for (const a of areas) {
      const v = s3[a];
      if (v == null || v === "") return null;
      const n = Number(v);
      if (isNaN(n) || n < 0 || n > max[a]) return null;
    }
    let num = 0, den = 0;
    areas.forEach(a => { num += (Number(s3[a]) / max[a]) * pesos[a]; den += pesos[a]; });
    return den ? (num / den) * 40 : null;
  }
  function provNota3Obj(p) { return calcNota3Obj(p.universidade, p.area, p.notas.s3); }

  // Total de acertos objetivos da 3ª série (soma bruta, para o corte de 22)
  function provAcertos3(s3) {
    if (!s3) return null;
    const areas = ["ling", "mat", "cn", "ch"];
    if (areas.some(a => s3[a] == null || s3[a] === "")) return null;
    return areas.reduce((t, a) => t + Number(s3[a]), 0);
  }

  // Nota final acumulada (0–100). Componentes não preenchidos contam como 0.
  // Redação já é 0–20 (nota real da Vunesp) = os 20% da NF, então entra direto na soma.
  function provNotaFinal(p) {
    const c = PDB.pesosCiclo;
    const n1 = provNotaGeral(p.notas.s1) || 0;   // 0–100
    const n2 = provNotaGeral(p.notas.s2) || 0;   // 0–100
    const n3 = provNota3Obj(p) || 0;             // 0–40 (peso da 3ª obj. já embutido)
    const red = (p.notas.s3 && p.notas.s3.red != null && p.notas.s3.red !== "") ? Number(p.notas.s3.red) : 0; // 0–20
    return n1 * c.serie1 + n2 * c.serie2 + n3 + red;
  }

  // % do ciclo já preenchido (soma dos pesos das etapas com dados)
  function provCicloPreenchido(p) {
    const c = PDB.pesosCiclo;
    let pct = 0;
    if (p.notas.s1 != null && p.notas.s1 !== "") pct += c.serie1;
    if (p.notas.s2 != null && p.notas.s2 !== "") pct += c.serie2;
    if (provNota3Obj(p) != null) pct += c.serie3Obj;
    const red = p.notas.s3 && p.notas.s3.red;
    if (red != null && red !== "") pct += c.redacao;
    return pct * 100;
  }

  // Status de aptidão da 3ª série (objetiva)
  function provStatusAptidao(p) {
    const acertos = provAcertos3(p.notas.s3);
    if (acertos == null) return { estado: "pendente", txt: "Preencha a 3ª série" };
    if (isEstadual(p.universidade)) {
      const corte = PDB.regras.corteObjetivaEstaduais;
      return acertos >= corte
        ? { estado: "ok", txt: `Apto · ${acertos} acertos (mín. ${corte})` }
        : { estado: "bad", txt: `Inapto · ${acertos} acertos (mín. ${corte}) — eliminação` };
    }
    // FATEC / UNIVESP: não pode zerar nenhuma área
    const zerou = ["ling", "mat", "cn", "ch"].some(a => Number(p.notas.s3[a]) === 0);
    return zerou
      ? { estado: "bad", txt: "Inapto · zerou uma área" }
      : { estado: "ok", txt: `Apto · sem áreas zeradas (${acertos} acertos)` };
  }

  // Status da redação da 3ª série
  function provStatusRedacao(p) {
    const s3 = p.notas.s3;
    const red = s3 && s3.red;
    if (red == null || red === "") return { estado: "pendente", txt: "Preencha a redação" };
    const r = Number(red);
    if (r <= 0) return { estado: "bad", txt: "Desclassificado · redação zerada" };
    if (isEstadual(p.universidade)) {
      const min = PDB.maxRedacao * PDB.regras.redacaoMinEstaduaisPct; // 20% de 20 = 4
      return r >= min
        ? { estado: "ok", txt: `Válida · ${r} de 20 pts (mín. ${min})` }
        : { estado: "bad", txt: `Abaixo do mínimo · ${r} de 20 pts (mín. ${min})` };
    }
    return { estado: "ok", txt: `Válida · ${r} de 20 pts` };
  }

  /* ============================================================
     4c) ITA — dados e motor de cálculo
     Fonte: ita_regras.md
     ============================================================ */
  const IDB = window.ITA_DB || {};

  // Nota Fase 1 (0–10, 4 casas): (Mat + Fís + Quí) / 36 × 10 — Inglês é só eliminatório
  function itaNotaF1(s) {
    const soma = Number(s.matF1 || 0) + Number(s.fisF1 || 0) + Number(s.quiF1 || 0);
    return (soma / IDB.fase1.escalaDenominador) * 10;
  }
  // Nota objetiva de Português (0–10): acertos / 15 × 10
  function itaNotaObjPortugues(s) {
    return (Number(s.portObj || 0) / IDB.fase2.questoesObjPortugues) * 10;
  }
  // MFPP — Média Final da Prova de Português: (objetiva + redação) / 2
  function itaMFPP(s) {
    return (itaNotaObjPortugues(s) + Number(s.redacao || 0)) / 2;
  }
  // Média Geral (0–10, 4 casas): 5 provas, cada uma 20% — campo vazio conta como zero
  function itaMediaGeral(s) {
    const f1 = itaNotaF1(s);
    const mat = Number(s.matF2 || 0), fis = Number(s.fisF2 || 0), qui = Number(s.quiF2 || 0);
    const mfpp = itaMFPP(s);
    return (f1 + mat + fis + qui + mfpp) * IDB.pesosMediaGeral;
  }
  // Status por campo (ok/bad/pendente), usado para colorir a tabela.
  // v == null/"" => pendente (ainda não preenchido). Caso contrário, compara com o mínimo.
  function itaStatus(v, min) {
    if (v == null || v === "") return "pendente";
    return Number(v) >= min ? "ok" : "bad";
  }
  function itaStatusPortObj(v) {
    if (v == null || v === "") return "pendente";
    return Number(v) >= IDB.fase2.minAcertosPortugues ? "ok" : "bad";
  }
  const itaCls = (estado) => estado === "ok" ? "status-ok" : estado === "bad" ? "status-bad" : "";
  // Meta de Redação pessoal (0–10), mesmo padrão da Meta Redação do painel UNESP.
  function itaMetaRedacao(p) {
    return p.metaRedacaoIta != null ? p.metaRedacaoIta : IDB.fase2.minRedacao;
  }
  const r4 = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  /* ============================================================
     4d) FUVEST MEDICINA (USP) — dados e motor de cálculo
     Fonte: fuvest_medicina.md
     ============================================================ */
  const FMDB = window.FUVEST_MED_DB || {};

  // Nota da 1ª fase (0–100): acertos × 100 / 90
  function fmNF1(acertos) { return (Number(acertos || 0) * 100) / 90; }
  // D1 = Português + Redação (1º dia, máx. 100)
  function fmD1(s) { return Number(s.portugues || 0) + Number(s.redacao || 0); }
  // D2 (2º dia, máx. 100): informado diretamente pelo aluno
  function fmD2(s) { return Number(s.d2 || 0); }
  // Nota Final (0–1000): média das 3 etapas (NF1, D1, D2) × 10
  function fmNotaFinal(s) { return ((fmNF1(s.acertos) + fmD1(s) + fmD2(s)) / 3) * 10; }

  function fmCorte1Fase(p) { return FMDB.corte1Fase[p.modalidade]; }
  function fmCorteNotaFinal(p) { return FMDB.corteNotaFinal[p.campus][p.modalidade]; }
  function fmNotaPrimeiraChamada(p) { return FMDB.notaPrimeiraChamada2026[p.campus][p.modalidade]; }

  const fmCls = (v, min) => (v == null || v === "") ? "" : (Number(v) >= min ? "status-ok" : "status-bad");
  const r1000 = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ============================================================
     5) ROTEAMENTO
     ============================================================ */
  let landingDismissed = false; // Nauka: landing só é pulada após clicar em "Entrar na Plataforma"
  function render() {
    const session = Store.getSession();
    if (!session || !Store.findUser(session)) {
      if (!landingDismissed) { renderLanding(); return; }
      renderOnboarding();
    } else {
      renderApp();
    }
  }

  /* ============================================================
     5b) LANDING PAGE — NAUKA (Passo 2, tela antes do onboarding)
     ============================================================ */
  const LANDING_THEME_KEY = "nauka_landing_theme";
  function getLandingTheme() {
    try { return localStorage.getItem(LANDING_THEME_KEY) === "light" ? "light" : "dark"; }
    catch (e) { return "dark"; }
  }
  function setLandingTheme(t) {
    try { localStorage.setItem(LANDING_THEME_KEY, t); } catch (e) {}
  }

  function renderLanding() {
    if (window.NaukaChatbot) window.NaukaChatbot.hide();
    root().innerHTML = "";
    const page = el("div", { class: "landing-page" });
    page.dataset.theme = getLandingTheme();
    const inner = el("div", { class: "landing-inner" });
    page.appendChild(inner);

    // Cabeçalho
    const header = el("div", { class: "landing-header landing-hero-in d1" });
    header.appendChild(el("div", {},
      `<div class="landing-brand-name">Nauka</div><div class="landing-brand-sub">Educação</div>`));
    const nav = el("div", { class: "landing-nav" });
    const linkOrigem = el("a", { href: "#nauka-cards", class: "landing-nav-link" }, "Por que existimos?");
    linkOrigem.onclick = (ev) => {
      ev.preventDefault();
      document.getElementById("nauka-cards").scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const subject = encodeURIComponent("Sugestão de Vestibular - Nauka");
    const linkSugerir = el("a",
      { href: `mailto:contato@naukaeducacao.com.br?subject=${subject}`, class: "landing-nav-link" },
      "SUGERIR VESTIBULAR");
    const themeBtn = el("button", { class: "landing-nav-link landing-theme-toggle", type: "button" });
    const themeLabel = (t) => (t === "light" ? "🌙 MODO ESCURO" : "☀️ MODO CLARO");
    themeBtn.textContent = themeLabel(page.dataset.theme);
    themeBtn.onclick = () => {
      const novo = page.dataset.theme === "light" ? "dark" : "light";
      page.dataset.theme = novo;
      setLandingTheme(novo);
      themeBtn.textContent = themeLabel(novo);
    };
    nav.append(linkOrigem, linkSugerir, themeBtn);
    header.appendChild(nav);
    inner.appendChild(header);

    // Hero
    const hero = el("div", { class: "landing-hero" });
    hero.appendChild(el("h1", { class: "landing-title landing-hero-in d2" },
      `Chega de caminhar no escuro. Monitore sua evolução e tenha o <span class="hl">controle dos seus resultados</span>.`));
    hero.appendChild(el("p", { class: "landing-sub landing-hero-in d3" },
      "Dos vestibulares tradicionais aos militares, uma ferramenta desenhada para mapear seu desempenho real e ajustar sua rota rumo à aprovação."));
    const cta = el("button", { class: "landing-cta landing-hero-in d3" }, "Entrar na Plataforma");
    cta.onclick = () => {
      landingDismissed = true;
      page.classList.add("landing-fade-out");
      setTimeout(renderOnboarding, 220);
    };
    hero.appendChild(cta);

    const stats = el("div", { class: "landing-stats landing-hero-in d4" });
    stats.appendChild(el("div", { class: "landing-stat" },
      `<span class="landing-stat-num">4</span><span class="landing-stat-lbl">vestibulares ativos</span>`));
    stats.appendChild(el("div", { class: "landing-stat" },
      `<span class="landing-stat-num">100%</span><span class="landing-stat-lbl">baseado em notas de corte reais</span>`));
    stats.appendChild(el("div", { class: "landing-stat" },
      `<span class="landing-stat-num">+</span><span class="landing-stat-lbl">novos vestibulares em breve</span>`));
    hero.appendChild(stats);
    inner.appendChild(hero);

    // Seção 01 — Vestibulares disponíveis
    const secVest = el("div", { class: "landing-section", id: "nauka-cards" });
    secVest.appendChild(el("div", { class: "landing-section-head landing-reveal" },
      `<span class="landing-section-num">01</span><span class="landing-section-title">Vestibulares disponíveis</span>`));
    const sheet = el("div", { class: "landing-sheet" });
    sheet.appendChild(sheetRow(true, "UNESP", "1ª e 2ª fase", "ativo", "ATIVO", 0));
    sheet.appendChild(sheetRow(true, "Provão Paulista", "Seriado", "ativo", "ATIVO", 1));
    sheet.appendChild(sheetRow(true, "Vestibulares Militares", "ITA", "ativo", "ATIVO", 2));
    sheet.appendChild(sheetRow(true, "Medicina", "FUVEST", "ativo", "ATIVO", 3));
    sheet.appendChild(sheetRow(false, "FUVEST e UNICAMP", "1ª e 2ª fase", "em-breve", "EM BREVE", 4));
    secVest.appendChild(sheet);
    inner.appendChild(secVest);

    // Seção 02 — Nosso propósito
    const secProp = el("div", { class: "landing-section" });
    secProp.appendChild(el("div", { class: "landing-section-head landing-reveal" },
      `<span class="landing-section-num">02</span><span class="landing-section-title">Nosso propósito</span>`));
    const manifesto = el("div", { class: "landing-manifesto landing-reveal" });
    manifesto.innerHTML = `
      <p class="landing-manifesto-lead">O acesso às principais universidades <em>não deveria</em> depender de mentorias caras ou planilhas confusas.</p>
      <p>A Nauka nasceu para simplificar a preparação do estudante, entregando uma ferramenta capaz de descentralizar o uso de dados complexos e permitir que o aluno entenda onde deve evoluir com base nos seus próprios resultados.</p>`;
    secProp.appendChild(manifesto);
    inner.appendChild(secProp);

    // Seção 03 — Como funciona
    const secComo = el("div", { class: "landing-section" });
    secComo.appendChild(el("div", { class: "landing-section-head landing-reveal" },
      `<span class="landing-section-num">03</span><span class="landing-section-title">Como funciona</span>`));
    const timeline = el("div", { class: "landing-timeline" });
    timeline.appendChild(timelineStep("Passo 1", "Escolha seu foco", "Defina seu objetivo na plataforma.", 0));
    timeline.appendChild(timelineStep("Passo 2", "Lance seus acertos", "Preencha suas notas de forma simplificada e centralizada.", 1));
    timeline.appendChild(timelineStep("Passo 3", "Monitore sua evolução", "Acompanhe seu progresso através de gráficos comparativos com as notas de corte baseadas nos últimos anos.", 2));
    secComo.appendChild(timeline);
    inner.appendChild(secComo);

    root().appendChild(page);
    setupScrollReveal(page);
  }

  // Anima seções/linhas/passos conforme entram na viewport.
  // Regra: a animação só toca ao DESCER. Ao subir, os itens aparecem sem
  // efeito; quando saem da tela, resetam de forma instantânea (fora da
  // viewport, invisível) para poderem animar de novo na próxima descida.
  function setupScrollReveal(page) {
    const alvos = page.querySelectorAll(".landing-reveal");
    if (!alvos.length) return;
    const semAnimacao = () => alvos.forEach(a => a.classList.add("no-anim", "in-view"));
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return semAnimacao();
    if (typeof IntersectionObserver === "undefined") return semAnimacao();

    let lastY = window.scrollY;
    let descendo = true;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (y !== lastY) { descendo = y > lastY; lastY = y; }
    }, { passive: true });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const t = entry.target;
        if (entry.isIntersecting) {
          if (descendo) {
            t.classList.remove("no-anim");   // reativa a transição → anima ao entrar
            t.classList.add("in-view");
          } else {
            t.classList.add("no-anim", "in-view"); // subindo: aparece direto, sem efeito
          }
        } else {
          t.classList.add("no-anim");        // reset instantâneo, fora da tela
          t.classList.remove("in-view");
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -30px 0px" });
    alvos.forEach(a => io.observe(a));
  }

  function sheetRow(ativo, nome, sub, statusCls, statusTxt, idx) {
    const row = el("div", { class: "landing-sheet-row landing-reveal" + (ativo ? " on" : "") });
    row.style.transitionDelay = (idx * 0.08) + "s";
    row.innerHTML = `
      <div class="landing-bubble${ativo ? " filled" : ""}"></div>
      <div><div class="landing-sheet-name">${esc(nome)}</div><div class="landing-sheet-sub">${esc(sub)}</div></div>
      <span class="landing-status ${statusCls}">${statusTxt}</span>`;
    return row;
  }

  function timelineStep(rotulo, titulo, texto, idx) {
    const step = el("div", { class: "landing-step landing-reveal" });
    step.style.transitionDelay = (idx * 0.12) + "s";
    step.innerHTML = `
      <div class="landing-step-label">${esc(rotulo)}</div>
      <h3>${esc(titulo)}</h3>
      <p>${esc(texto)}</p>`;
    return step;
  }

  /* ============================================================
     6) ONBOARDING (entrada / cadastro / login)
     ============================================================ */
  function renderOnboarding(mode = "cadastro") {
    if (window.NaukaChatbot) window.NaukaChatbot.hide();
    root().innerHTML = "";
    window.scrollTo(0, 0); // evita abrir a tela já "rolada" ao vir da landing

    const shell = el("div", { class: "auth-shell mode-" + mode });
    const paneForm = el("div", { class: "auth-pane-form" });
    const paneBrand = el("div", { class: "auth-brand-zone" });
    shell.append(paneBrand, paneForm);
    root().appendChild(shell);

    let current = mode;

    function fillForm(m) {
      const inner = el("div", { class: "auth-form-inner" });
      inner.appendChild(el("div", { class: "brand" },
        `<div class="logo">Foco Vestibular</div><h1>${m === "cadastro" ? "Criar conta" : "Bem-vindo(a) de volta"}</h1>`));
      inner.appendChild(el("p", { class: "tagline" },
        m === "cadastro"
          ? "Monitore seus acertos, corrija seus erros e domine o formato da prova."
          : "Continue de onde parou — sua evolução está te esperando."));

      const errBox = el("div", { class: "error-msg hidden" });
      inner.appendChild(errBox);
      const showErr = (t) => { errBox.textContent = t; errBox.classList.remove("hidden"); };

      const form = el("form");
      if (m === "cadastro") {
        form.appendChild(fieldHTML("Nome", `<input class="input" name="nome" placeholder="Seu nome" autocomplete="name">`));
      }
      const senhaPlaceholder = m === "cadastro" ? "Crie uma senha" : "Sua senha";
      form.appendChild(fieldHTML("E-mail", `<input class="input" name="email" type="email" placeholder="Voce@gmail.com" autocomplete="email">`));
      form.appendChild(campoSenha("Senha", {
        name: "senha", placeholder: senhaPlaceholder,
        autocomplete: m === "cadastro" ? "new-password" : "current-password",
      }));
      if (m === "cadastro") {
        form.appendChild(campoSenha("Confirmar senha", {
          name: "confirmarSenha", placeholder: "Repita a senha", autocomplete: "new-password",
        }));
      }

      const submit = el("button", { class: "btn btn-primary btn-block", type: "submit" },
        m === "cadastro" ? "Criar conta e começar" : "Entrar");
      form.appendChild(submit);

      // Só aparece no mobile (ver CSS) — no desktop a troca de modo já acontece
      // pelo painel azul ao lado.
      const switchP = el("p", { class: "auth-switch-mobile" });
      const switchBtn = el("button", { type: "button" },
        m === "cadastro" ? "Entrar" : "Cadastre-se");
      switchBtn.onclick = () => switchTo(m === "cadastro" ? "login" : "cadastro");
      switchP.append(m === "cadastro" ? "Já tem conta? " : "Ainda não tem conta? ", switchBtn);
      form.appendChild(switchP);

      form.onsubmit = async (ev) => {
        ev.preventDefault();
        const f = ev.target;
        const email = (f.email.value || "").trim().toLowerCase();
        const senha = (f.senha.value || "").trim();
        if (!email || !senha) return showErr("Preencha e-mail e senha.");
        if (!SB) return showErr("Sem conexão com o servidor. Tente novamente em instantes.");

        const nome = m === "cadastro" ? (f.nome.value || "").trim() : "";
        if (m === "cadastro" && !nome) return showErr("Informe o seu nome.");
        if (m === "cadastro" && senha !== (f.confirmarSenha.value || "").trim()) {
          return showErr("As senhas não coincidem. Revise e tente novamente.");
        }

        submit.disabled = true;
        const rotuloOriginal = submit.textContent;
        submit.textContent = m === "cadastro" ? "Criando conta..." : "Entrando...";
        const liberar = () => { submit.disabled = false; submit.textContent = rotuloOriginal; };

        try {
          if (m === "cadastro") {
            const { data, error } = await SB.auth.signUp({
              email, password: senha, options: { data: { nome } },
            });
            if (error) { liberar(); return showErr(traduzErro(error)); }
            if (data.session && data.user) {
              await adotarUsuario(data.user);
              render();
            } else {
              liberar();
              showErr("Conta criada! Enviamos um e-mail de confirmação — confirme e depois faça login.");
            }
          } else {
            const { data, error } = await SB.auth.signInWithPassword({ email, password: senha });
            if (error) { liberar(); return showErr(traduzErro(error)); }
            await adotarUsuario(data.user);
            render();
          }
        } catch (e) {
          liberar();
          showErr("Não foi possível concluir. Verifique sua internet e tente de novo.");
        }
      };

      inner.appendChild(form);
      paneForm.innerHTML = "";
      paneForm.appendChild(inner);
    }

    function fillBrand(m) {
      const inner = el("div", { class: "auth-brand-inner" });
      inner.innerHTML = m === "cadastro"
        ? `<div class="auth-brand-logo">Nauka</div>
           <div class="auth-brand-sub">Educação</div>
           <h2>Já faz parte da turma?</h2>
           <p>Entre com sua conta e continue acompanhando sua evolução rumo à aprovação.</p>`
        : `<div class="auth-brand-logo">Nauka</div>
           <div class="auth-brand-sub">Educação</div>
           <h2>Ainda não tem conta?</h2>
           <p>Cadastre-se em menos de um minuto e comece a organizar seus estudos hoje.</p>`;
      const btn = el("button", { class: "auth-ghost-btn", type: "button" },
        m === "cadastro" ? "Já tenho conta!" : "Quero me cadastrar");
      btn.onclick = () => switchTo(m === "cadastro" ? "login" : "cadastro");
      inner.appendChild(btn);
      paneBrand.innerHTML = "";
      paneBrand.appendChild(inner);
    }

    function switchTo(next) {
      if (next === current) return;
      current = next;
      shell.classList.remove("mode-cadastro", "mode-login");
      shell.classList.add("mode-" + next);
      setTimeout(() => { fillForm(next); fillBrand(next); }, 300);
    }

    fillForm(current);
    fillBrand(current);
  }
  function fieldHTML(label, innerHTML) {
    return el("div", { class: "field" }, `<label>${label}</label>${innerHTML}`);
  }

  // Campo de senha com botão de "olho" para mostrar/ocultar o que foi digitado.
  function campoSenha(label, attrs) {
    const field = el("div", { class: "field" }, `<label>${label}</label>`);
    const wrap = el("div", { class: "senha-wrap" });
    const attrsStr = Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(" ");
    wrap.innerHTML = `<input class="input" type="password" ${attrsStr}>`;
    const toggle = el("button", {
      type: "button", class: "senha-toggle", "aria-label": "Mostrar senha", tabindex: "-1",
    });
    toggle.innerHTML = EYE_ICON;
    let visivel = false;
    toggle.onclick = () => {
      visivel = !visivel;
      const input = $("input", wrap);
      input.type = visivel ? "text" : "password";
      toggle.innerHTML = visivel ? EYE_OFF_ICON : EYE_ICON;
      toggle.setAttribute("aria-label", visivel ? "Ocultar senha" : "Mostrar senha");
    };
    wrap.appendChild(toggle);
    field.appendChild(wrap);
    return field;
  }

  /* ============================================================
     7) APP / DASHBOARD
     ============================================================ */
  let chart = null;
  let activeSection = "inicio";   // 'inicio' | 'analise' | 'caderno' | 'config' | 'perfil'
  let editingRow = null;   // id do simulado em edição (ou null)

  const SIDEBAR_ITEMS = [
    { key: "inicio", label: "Início", icon: ICON_INICIO },
    { key: "analise", label: "Análise", icon: ICON_ANALISE },
    { key: "caderno", label: "Caderno de Erros", icon: ICON_CADERNO },
    { key: "calendario", label: "Calendário", icon: ICON_CALENDARIO },
    { key: "config", label: "Configurações", icon: ICON_CONFIG, bottom: true },
    { key: "perfil", label: "Perfil", icon: ICON_PERFIL },
  ];

  function renderSidebar() {
    const sidebar = el("div", { class: "app-sidebar" });
    SIDEBAR_ITEMS.forEach(item => {
      const btn = el("button", {
        class: "sidebar-item" + (activeSection === item.key ? " active" : "") + (item.bottom ? " sidebar-item-bottom" : ""),
        type: "button",
      });
      btn.innerHTML = `${item.icon}<span class="sidebar-tooltip">${esc(item.label)}</span>`;
      btn.onclick = () => { activeSection = item.key; renderApp(); };
      sidebar.appendChild(btn);
    });
    return sidebar;
  }

  function renderApp() {
    if (window.NaukaChatbot) window.NaukaChatbot.show();
    const user = Store.findUser(Store.getSession());
    const data = Store.userData();
    root().innerHTML = "";

    // Cabeçalho (largura total, como antes da sidebar)
    const header = el("div", { class: "app-header" });
    const userBox = el("div", { class: "user-box" });
    userBox.appendChild(el("span", { class: "user-name" }, esc(user.nome)));
    const bSair = el("button", { class: "link-btn" }, "Sair");
    bSair.onclick = async () => { if (SB) { try { await SB.auth.signOut(); } catch (e) {} } Store.logout(); render(); };
    userBox.append(bSair);
    header.appendChild(userBox);
    header.appendChild(el("div", { class: "brand-center" }, `<div class="logo">Foco Vestibular</div><div class="app-name">Painel de Desempenho</div>`));
    root().appendChild(header);

    // Corpo: sidebar + conteúdo
    const bodyRow = el("div", { class: "app-body" });
    bodyRow.appendChild(renderSidebar());

    const main = el("div", { class: "app-main" });

    // Container
    const cont = el("div", { class: "container" });
    const ativo = data.paineis.find(p => p.id === data.ativo);

    // Barra de abas — só aparece no Início
    if (activeSection === "inicio" && data.paineis.length) {
      const tabbar = el("div", { class: "tabbar" });
      data.paineis.forEach(p => {
        const tab = el("div", { class: "tab" + (p.id === data.ativo ? " active" : "") });
        const label = el("span", {}, esc(panelLabel(p)));
        label.style.cursor = "pointer";
        label.onclick = () => { data.ativo = p.id; Store.saveUserData(data); renderApp(); };
        tab.appendChild(label);
        const x = el("button", { class: "tab-close", title: "Fechar painel" }, "×");
        x.onclick = async () => {
          if (!confirm(`Remover o painel "${panelLabel(p)}"? Os dados deste painel serão apagados.`)) return;
          const tabela = p.tipo === "provao" ? "paineis_provao_paulista"
            : p.tipo === "ita" ? "paineis_ita"
            : p.tipo === "fuvest_medicina" ? "paineis_fuvest_medicina"
            : "paineis_unesp";
          const { error } = await SB.from(tabela).delete().eq("id", p.id);
          if (error) { alert("Não foi possível remover o painel. Tente novamente."); return; }
          // Limpa os erros do Caderno vinculados a este painel (não têm exclusão automática).
          await SB.from("caderno_erros").delete().eq("painel_id", p.id);
          data.paineis = data.paineis.filter(q => q.id !== p.id);
          if (data.ativo === p.id) data.ativo = data.paineis[0] ? data.paineis[0].id : null;
          Store.saveUserData(data);
          renderApp();
        };
        tab.appendChild(x);
        tabbar.appendChild(tab);
      });
      const add = el("button", { class: "tab-add", title: "Novo painel" }, "+");
      add.onclick = openEscolhaPainel;
      tabbar.appendChild(add);
      cont.appendChild(tabbar);
    }

    // Conteúdo — depende da seção ativa na sidebar
    if (activeSection === "config") {
      cont.appendChild(renderConfigPanel());
    } else if (activeSection === "perfil") {
      cont.appendChild(renderPerfilPanel(data));
    } else if (activeSection === "caderno") {
      if (!ativo) {
        const ew = el("div", { class: "empty-wrap" });
        ew.appendChild(emptyState());
        cont.appendChild(ew);
      } else {
        const cadernoWrap = el("div", { id: "caderno-embed-root", class: "ce-embed" });
        cont.appendChild(cadernoWrap);
        setTimeout(() => {
          if (window.NaukaCadernoErros) window.NaukaCadernoErros.mount(cadernoWrap, ativo.id);
        }, 0);
      }
    } else if (activeSection === "calendario") {
      const calWrap = el("div", { id: "calendario-embed-root", class: "cal-embed" });
      cont.appendChild(calWrap);
      setTimeout(() => {
        if (window.NaukaCalendario) window.NaukaCalendario.mount(calWrap);
      }, 0);
    } else {
      // 'inicio' | 'analise'
      if (!ativo) {
        const ew = el("div", { class: "empty-wrap" });
        ew.appendChild(emptyState());
        cont.appendChild(ew);
      } else cont.appendChild(renderPainel(ativo, data));
    }

    main.appendChild(cont);
    bodyRow.appendChild(main);
    root().appendChild(bodyRow);
  }

  function renderConfigPanel() {
    const data = Store.userData();
    const wrap = el("div");

    // Seção 1: Tema e Acessibilidade
    const sec1 = el("div", { class: "card" });
    sec1.appendChild(el("h3", {}, "Tema e Acessibilidade"));

    const themeSetting = getOrInitSetting("theme", "auto");
    const themeField = el("div", { class: "field" });
    themeField.innerHTML = `<label>Tema</label>`;
    const themeSel = el("select", { class: "select", id: "cfg-theme" });
    themeSel.appendChild(el("option", { value: "auto" }, "Automático (sistema)"));
    themeSel.appendChild(el("option", { value: "light" }, "Claro"));
    themeSel.appendChild(el("option", { value: "dark" }, "Escuro"));
    themeSel.value = themeSetting;
    themeSel.onchange = () => {
      saveOrUpdateSetting("theme", themeSel.value);
      applyTheme(themeSel.value);
    };
    themeField.appendChild(themeSel);
    sec1.appendChild(themeField);

    const fontField = el("div", { class: "field" });
    fontField.innerHTML = `<label>Tamanho de fonte</label>`;
    const fontSel = el("select", { class: "select", id: "cfg-font" });
    const fontSetting = getOrInitSetting("fontSize", "normal");
    fontSel.appendChild(el("option", { value: "pequena" }, "Pequena"));
    fontSel.appendChild(el("option", { value: "normal" }, "Normal"));
    fontSel.appendChild(el("option", { value: "grande" }, "Grande"));
    fontSel.appendChild(el("option", { value: "muito-grande" }, "Muito grande"));
    fontSel.value = fontSetting;
    fontSel.onchange = () => {
      saveOrUpdateSetting("fontSize", fontSel.value);
      applyFontSize(fontSel.value);
    };
    fontField.appendChild(fontSel);
    sec1.appendChild(fontField);

    const contrastField = el("div", { class: "field" });
    contrastField.innerHTML = `<label>Contraste aumentado</label>`;
    const contrastChk = el("input", { type: "checkbox", id: "cfg-contrast", style: "width:20px;height:20px;cursor:pointer;" });
    const contrastSetting = getOrInitSetting("highContrast", "false") === "true";
    contrastChk.checked = contrastSetting;
    contrastChk.onchange = () => {
      saveOrUpdateSetting("highContrast", String(contrastChk.checked));
      applyContrast(contrastChk.checked);
    };
    contrastField.appendChild(contrastChk);
    sec1.appendChild(contrastField);
    wrap.appendChild(sec1);

    // Seção 2: Ordenação Padrão
    const sec2 = el("div", { class: "card", style: "margin-top:16px;" });
    sec2.appendChild(el("h3", {}, "Ordenação Padrão de Simulados"));
    sec2.appendChild(el("p", { class: "card-sub" }, "Escolha como os simulados aparecem na tabela."));

    const sortField = el("div", { class: "field" });
    sortField.innerHTML = `<label>Ordenar por</label>`;
    const sortSel = el("select", { class: "select", id: "cfg-sort" });
    const sortSetting = getOrInitSetting("defaultSort", "data-desc");
    sortSel.appendChild(el("option", { value: "data-desc" }, "Mais recente primeiro"));
    sortSel.appendChild(el("option", { value: "data-asc" }, "Mais antigo primeiro"));
    sortSel.appendChild(el("option", { value: "media-desc" }, "Melhor média primeiro"));
    sortSel.appendChild(el("option", { value: "media-asc" }, "Pior média primeiro"));
    sortSel.value = sortSetting;
    sortSel.onchange = () => {
      saveOrUpdateSetting("defaultSort", sortSel.value);
      renderApp();
    };
    sortField.appendChild(sortSel);
    sec2.appendChild(sortField);
    wrap.appendChild(sec2);

    // Seção 3: Privacidade e Dados (por último)
    const sec3 = el("div", { class: "card", style: "margin-top:16px;" });
    sec3.appendChild(el("h3", {}, "Privacidade e Dados"));
    const privacyInfo = el("p", { class: "card-sub" });
    privacyInfo.innerHTML = `Seus dados são armazenados localmente no navegador e no Supabase (back-end seguro com criptografia). Você pode deletar sua conta a qualquer momento — todos os dados serão removidos permanentemente.`;
    sec3.appendChild(privacyInfo);

    const bDeleteAccount = el("button", { class: "btn", style: "background:#C0281E;color:#fff;margin-top:12px;" }, "Deletar Conta");
    bDeleteAccount.onclick = () => {
      if (!confirm("Tem certeza? Essa ação é irreversível e removerá TODOS os seus dados.")) return;
      if (!confirm("Essa é a última confirmação. Seus dados serão deletados permanentemente.")) return;
      deletarContaUsuario();
    };
    sec3.appendChild(bDeleteAccount);
    wrap.appendChild(sec3);

    return wrap;
  }

  function renderPerfilPanel(data) {
    const user = Store.findUser(Store.getSession());
    const wrap = el("div", { class: "card" });
    wrap.appendChild(el("h2", {}, "Meu Perfil"));
    const body = el("div");
    body.appendChild(fieldHTML("Nome", `<input class="input" id="pf-nome" value="${esc(user.nome)}">`));
    body.appendChild(fieldHTML("E-mail", `<input class="input" id="pf-email" value="${esc(user.email)}" disabled>`));
    body.appendChild(fieldHTML("Nova senha (opcional)", `<input class="input" id="pf-senha" type="password" placeholder="deixe em branco p/ manter">`));
    body.appendChild(fieldHTML("Anotações pessoais",
      `<textarea class="textarea" id="pf-notas" style="min-height:110px" placeholder="Metas, lembretes, estratégia de estudos...">${esc(data.perfil.notas || "")}</textarea>`));
    body.appendChild(el("p", { class: "help" }, "Suas anotações não interferem em nenhum cálculo do sistema."));
    wrap.appendChild(body);

    const salvar = el("button", { class: "btn btn-primary", style: "margin-top:6px" }, "Salvar alterações");
    salvar.onclick = async () => {
      const key = Store.getSession();
      const nome = $("#pf-nome", body).value.trim() || user.nome;
      const senha = $("#pf-senha", body).value.trim();

      // Anotações e nome de exibição: espelho local (usado pela tela e o Caderno de Erros).
      const db = Store._base();
      db.users[key].nome = nome;
      db.data[key].perfil.notas = $("#pf-notas", body).value;
      Store._write(db);

      // Back-end: atualiza nome (metadata + tabela profiles) e, se preenchida, a senha.
      if (SB) {
        try {
          const updates = { data: { nome } };
          if (senha) updates.password = senha;
          const { error } = await SB.auth.updateUser(updates);
          if (error) { alert("Alterações locais salvas, mas o servidor recusou: " + traduzErro(error)); }
          else { await SB.from("profiles").update({ nome }).eq("id", key); }
        } catch (e) {
          alert("Alterações salvas localmente, mas não foi possível sincronizar com o servidor agora.");
        }
      }
      renderApp();
    };
    wrap.appendChild(salvar);
    return wrap;
  }

  function emptyState() {
    const e = el("div", { class: "empty-state" });
    e.innerHTML = `<h2>Nenhum painel ainda</h2>
      <p>Escolha como quer começar: crie um painel para acompanhar um vestibular específico, ou acompanhe o seu ciclo no Provão Paulista Seriado.</p>`;
    const acoes = el("div", { class: "empty-actions" });
    const bMedicina = el("button", { class: "btn btn-primary" }, "Medicina");
    bMedicina.onclick = openMedicinaModal;
    const b1 = el("button", { class: "btn btn-primary" }, "Vestibular Tradicional");
    b1.onclick = openNovoPainel;
    const bMilitar = el("button", { class: "btn btn-primary" }, "Vestibular Militar");
    bMilitar.onclick = openMilitarModal;
    const b2 = el("button", { class: "btn btn-primary" }, "Provão Paulista");
    b2.onclick = openProvaoModal;
    acoes.append(bMedicina, b1, bMilitar, b2);
    e.appendChild(acoes);
    return e;
  }

  // Menu ao clicar no "+" quando já existem painéis
  function openEscolhaPainel() {
    const body = el("div", { class: "escolha-painel" });
    const bMedicina = el("button", { class: "btn btn-primary btn-block" }, "Medicina");
    bMedicina.onclick = () => { closeModal(); openMedicinaModal(); };
    const b1 = el("button", { class: "btn btn-primary btn-block" }, "Vestibular Tradicional");
    b1.onclick = () => { closeModal(); openNovoPainel(); };
    const bMilitar = el("button", { class: "btn btn-primary btn-block" }, "Vestibular Militar");
    bMilitar.onclick = () => { closeModal(); openMilitarModal(); };
    const b2 = el("button", { class: "btn btn-primary btn-block" }, "Provão Paulista");
    b2.onclick = () => { closeModal(); openProvaoModal(); };
    body.append(bMedicina, b1, bMilitar, b2);
    openModal("O que deseja criar?", body, null, null);
  }

  /* ============================================================
     8c) MODAL: MEDICINA (FUVEST — Medicina USP)
     ============================================================ */
  function openMedicinaModal() {
    const data = Store.userData();
    const state = { instituicao: null, campus: null, modalidade: null };

    const body = el("div");

    // Universidade — clique em "USP" para avançar (demais ainda não disponíveis)
    const wrap = el("div", { class: "field" });
    wrap.innerHTML = `<label><span class="step-num">1</span>Universidade</label>`;
    const grid = el("div", { class: "fac-grid" });
    const opts = [["USP", true], ["Unicamp", false], ["Unesp", false], ["Albert Einstein", false], ["Santa Casa", false], ["FAMEMA", false], ["FAMERP", false]];
    let uspOpt = null;
    opts.forEach(([nome, on]) => {
      const o = el("div", { class: "fac-opt" + (on ? "" : " disabled") },
        on ? nome : `${nome}<span class="soon">Em breve</span>`);
      if (on) {
        uspOpt = o;
        o.style.cursor = "pointer";
        o.onclick = () => {
          state.instituicao = "USP";
          o.classList.add("selected");
          campusWrap.classList.remove("hidden");
        };
      }
      grid.appendChild(o);
    });
    wrap.appendChild(grid);
    body.appendChild(wrap);

    // Campus — só aparece depois de escolher USP
    const campusWrap = el("div", { class: "field hidden" });
    campusWrap.innerHTML = `<label><span class="step-num">2</span>Campus</label>`;
    const campusSel = el("select", { class: "select" });
    campusSel.appendChild(el("option", { value: "" }, "Selecione..."));
    FMDB.campi.forEach(c => campusSel.appendChild(el("option", { value: c }, c)));
    campusSel.onchange = () => {
      state.campus = campusSel.value || null;
      if (state.campus) modWrap.classList.remove("hidden");
      else modWrap.classList.add("hidden");
    };
    campusWrap.appendChild(campusSel);
    body.appendChild(campusWrap);

    // Modalidade — só aparece depois de escolher o campus
    const modWrap = el("div", { class: "field hidden" });
    modWrap.innerHTML = `<label><span class="step-num">3</span>Modalidade de concorrência</label>`;
    const tg = el("div", { class: "toggle-group" });
    const modOpts = {};
    FMDB.modalidades.forEach((m) => {
      const opt = el("div", { class: "toggle-opt" },
        `${FMDB.modalidadeLabel[m]}<small>${m}</small>`);
      opt.onclick = () => {
        state.modalidade = m;
        Object.values(modOpts).forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
      };
      modOpts[m] = opt;
      tg.appendChild(opt);
    });
    modWrap.appendChild(tg);
    body.appendChild(modWrap);

    const err = el("div", { class: "error-msg hidden" });
    body.appendChild(err);

    async function salvar() {
      if (!state.instituicao) {
        err.textContent = "Selecione a universidade (USP)."; err.classList.remove("hidden"); return;
      }
      if (!state.campus) {
        err.textContent = "Selecione o campus."; err.classList.remove("hidden"); return;
      }
      if (!state.modalidade) {
        err.textContent = "Selecione a modalidade de concorrência."; err.classList.remove("hidden"); return;
      }
      const metaSegundaFase = fmNotaPrimeiraChamada({ campus: state.campus, modalidade: state.modalidade });
      const { data: row, error } = await SB.from("paineis_fuvest_medicina").insert({
        user_id: Store.getSession(),
        campus: state.campus, modalidade: state.modalidade,
        meta_objetiva: 0, meta_redacao: 0, meta_segunda_fase: metaSegundaFase,
      }).select().single();
      if (error) {
        err.textContent = "Não foi possível criar o painel. Tente novamente."; err.classList.remove("hidden"); return;
      }
      const painel = {
        id: row.id, tipo: "fuvest_medicina",
        campus: row.campus, modalidade: row.modalidade,
        metaObjetiva: Number(row.meta_objetiva), metaRedacao: Number(row.meta_redacao),
        metaSegundaFase: Number(row.meta_segunda_fase),
        simulados: [],
      };
      data.paineis.push(painel);
      data.ativo = painel.id;
      Store.saveUserData(data);
      closeModal();
      renderApp();
    }

    openModal("Configurar Medicina — USP (FUVEST)", body, salvar, "Criar painel");
  }

  /* ============================================================
     8d) MODAL: VESTIBULAR MILITAR
     ============================================================ */
  function openMilitarModal() {
    const data = Store.userData();
    const state = { instituicao: "ITA" }; // categoria "Vestibular Militar" → só ITA habilitado por ora (IME/AFA futuros)

    const body = el("div");
    const wrap = el("div", { class: "field" });
    wrap.innerHTML = `<label><span class="step-num">1</span>Instituição</label>`;
    const grid = el("div", { class: "fac-grid" });
    const opts = [["ITA", true], ["IME", false], ["AFA", false]];
    opts.forEach(([nome, on]) => {
      const o = el("div", { class: "fac-opt" + (on ? " selected" : " disabled") },
        on ? nome : `${nome}<span class="soon">Em breve</span>`);
      grid.appendChild(o);
    });
    wrap.appendChild(grid);
    body.appendChild(wrap);

    const err = el("div", { class: "error-msg hidden" });
    body.appendChild(err);

    async function salvar() {
      const { data: row, error } = await SB.from("paineis_ita").insert({
        user_id: Store.getSession(),
      }).select().single();
      if (error) {
        err.textContent = "Não foi possível criar o painel. Tente novamente."; err.classList.remove("hidden"); return;
      }
      const painel = { id: row.id, tipo: "ita", simulados: [] };
      data.paineis.push(painel);
      data.ativo = painel.id;
      Store.saveUserData(data);
      closeModal();
      renderApp();
    }

    openModal("Configurar Vestibular Militar", body, salvar, "Criar painel");
  }

  /* ---------- Painel (metas + tabela + gráfico) ---------- */
  function renderPainel(p, data) {
    if (p.tipo === "provao") return renderProvao(p, data);
    if (p.tipo === "ita") return renderIta(p, data);
    if (p.tipo === "fuvest_medicina") return renderFuvestMedicina(p, data);
    const wrap = el("div");
    const view = activeSection === "analise" ? "analise" : "geral";

    const head = el("div", { class: "provao-head" });
    head.innerHTML = `<h3>UNESP — Universidade Estadual Paulista</h3>`;
    wrap.appendChild(head);

    if (view === "geral") {
      const cards = el("div", { class: "meta-cards meta-cards-duo" });
      cards.appendChild(metaCardObjetivaInputUnesp(p, data));
      cards.appendChild(metaCardRedacaoInput(p, data));
      wrap.appendChild(cards);
    }

    if (view === "geral") {
      const tableCard = el("div", { class: "card" });
      const titleDiv1 = el("div", { style: "display:flex;align-items:center;justify-content:space-between;" });
      const h3Unesp = el("h3", {}, "Histórico de Simulados");
      const infoHistBtnUnesp = el("button", { style: "background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;" });
      infoHistBtnUnesp.innerHTML = QUESTION_ICON;
      infoHistBtnUnesp.onclick = () => abrirPopover("Histórico de Simulados", "Preencha a última linha e clique em Adicionar. Os cálculos são automáticos.");
      titleDiv1.appendChild(h3Unesp);
      titleDiv1.appendChild(infoHistBtnUnesp);
      tableCard.appendChild(titleDiv1);
      tableCard.appendChild(el("div", { class: "legend-row" },
        `<span class="legend-chip chip-ok">✔ Dentro da meta</span>
         <span class="legend-chip chip-bad">✘ Abaixo da meta</span>`));
      tableCard.appendChild(buildTable(p, data));
      wrap.appendChild(tableCard);
    } else {
      // KPIs rápidos
      if (p.simulados.length) {
        const medias = p.simulados.map(s => mediaFinal(s));
        const melhor = Math.max(...medias);
        const evolucao = medias.length > 1 ? medias[medias.length - 1] - medias[0] : 0;
        const kpis = el("div", { class: "kpi-row" });
        kpis.appendChild(kpiCard("Melhor média", r1(melhor) + " pts"));
        kpis.appendChild(kpiCard("Simulados", String(p.simulados.length)));
        kpis.appendChild(kpiCard("Evolução (1º → último)", (evolucao >= 0 ? "+" : "") + r1(evolucao) + " pts",
          evolucao > 0 ? "kpi-up" : evolucao < 0 ? "kpi-down" : ""));
        wrap.appendChild(kpis);
      }

      const chartCard = el("div", { class: "card" });
      chartCard.appendChild(el("h3", {}, "Evolução da Média Final"));
      chartCard.appendChild(el("p", { class: "card-sub" }, "Evolução da sua média em cada simulado registrado."));
      const box = el("div", { class: "chart-box chart-box-lg" });
      const canvas = el("canvas", { id: "evoChart" });
      box.appendChild(canvas);
      chartCard.appendChild(box);
      chartCard.appendChild(el("div", { class: "future-hint" },
        "🔧 Em breve: registro detalhado de erros por simulado, como na planilha original."));
      wrap.appendChild(chartCard);
      setTimeout(() => drawChart(p), 0);
    }
    return wrap;
  }

  function kpiCard(label, value, extraCls) {
    return el("div", { class: "kpi-card" },
      `<div class="kpi-label">${label}</div><div class="kpi-value ${extraCls || ""}">${value}</div>`);
  }

  function analiseIndisponivelCard(msg) {
    return el("div", { class: "card" }, `<p class="card-sub" style="margin:0">${esc(msg)}</p>`);
  }

  function metaCard(tone, label, value, sub) {
    return el("div", { class: "meta-card meta-" + tone },
      `<div class="meta-label">${label}</div>
       <div class="meta-value">${value}</div><div class="meta-sub">${sub}</div>`);
  }

  // Meta 1ª Fase (Objetiva): card editável — o aluno define a meta de acertos que almeja (0–90).
  // Valor inicial replica a nota de corte oficial do curso/modalidade escolhidos na criação do painel.
  function metaCardObjetivaInputUnesp(p, data) {
    const meta = p.metaObjetiva != null ? p.metaObjetiva : 0;
    const corte = unespCorteOficial(p);
    const card = el("div", { class: "meta-card meta-objetiva" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">Meta 1ª Fase (Objetiva)</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="90" value="${meta}">
        <small style="font-size:14px;font-weight:600">ACERTOS</small>
      </div>`;
    card.querySelector(".info-btn").onclick = () => abrirPopover("Meta 1ª Fase (Objetiva)",
      `Defina sua meta pessoal de acertos na 1ª fase. ${corte != null ? "Nota de corte oficial: " + corte + " acertos — " : ""}UNESP · ${p.modalidade === "SU" ? "Ampla Concorrência" : "Cotas"} · ${esc(p.curso)} (${esc(p.cidade)}).`);
    const input = $(".meta-input", card);
    const commitAndRefresh = async () => {
      let v = Math.round(Number(input.value));
      if (isNaN(v)) v = meta;
      v = Math.min(90, Math.max(0, v));
      input.value = v;
      if (p.metaObjetiva !== v) {
        const { error } = await SB.from("paineis_unesp").update({ meta_objetiva: v }).eq("id", p.id);
        if (!error) p.metaObjetiva = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => { if (committed) return; committed = true; commitAndRefresh(); };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    return card;
  }

  // Meta Redação: card editável — o aluno define a nota que almeja (0–28).
  // Valor inicial replica o referencial que o sistema já usava (META_REDACAO = 24).
  function metaCardRedacaoInput(p, data) {
    const metaRed = p.metaRedacao != null ? p.metaRedacao : META_REDACAO;
    const card = el("div", { class: "meta-card meta-redacao" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">Meta Redação</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="28" value="${metaRed}">
        <small style="font-size:14px;font-weight:600">PONTOS</small>
      </div>`;
    card.querySelector(".info-btn").onclick = () => abrirPopover("Meta Redação", "Defina sua meta pessoal de pontuação em redação. A escala é de 0 a 28 pontos.");
    const input = $(".meta-input", card);
    // Confirma o valor e atualiza o dashboard inteiro (tabela recolore com a nova meta).
    const commitAndRefresh = async () => {
      let v = Math.round(Number(input.value));
      if (isNaN(v)) v = metaRed;
      v = Math.min(28, Math.max(0, v));
      input.value = v;
      if (p.metaRedacao !== v) {
        const { error } = await SB.from("paineis_unesp").update({ meta_redacao: v }).eq("id", p.id);
        if (!error) p.metaRedacao = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => {
      if (committed) return;
      committed = true;
      commitAndRefresh();
    };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      // Alguns ambientes/teclados não preenchem ev.key — checa também keyCode/which (13 = Enter).
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    return card;
  }

  // Meta Redação do painel ITA — mesmo padrão do card do UNESP, adaptado à escala 0–10.
  function metaCardRedacaoInputIta(p, data) {
    const metaRed = itaMetaRedacao(p);
    const card = el("div", { class: "meta-card meta-redacao" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">Meta Redação</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="10" step="0.01" value="${metaRed}">
        <small style="font-size:14px;font-weight:600">PONTOS</small>
      </div>`;
    card.querySelector(".info-btn").onclick = () => abrirPopover("Meta Redação", "Defina sua meta pessoal de nota em redação. A escala é de 0 a 10 pontos.");
    const input = $(".meta-input", card);
    const commitAndRefresh = () => {
      let v = Number(input.value);
      if (isNaN(v)) v = metaRed;
      v = Math.min(10, Math.max(0, v));
      input.value = v;
      if (p.metaRedacaoIta !== v) {
        p.metaRedacaoIta = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => {
      if (committed) return;
      committed = true;
      commitAndRefresh();
    };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    return card;
  }

  // Meta de Acertos (1ª Fase) do painel ITA — soma de Mat+Fís+Quí (0–36; Inglês não conta ponto, só elimina).
  function metaCardAcertosInputIta(p, data) {
    const meta = p.metaAcertosIta != null ? p.metaAcertosIta : 18;
    const card = el("div", { class: "meta-card meta-objetiva" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">Meta de Acertos (1ª Fase)</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="36" value="${meta}">
        <small style="font-size:14px;font-weight:600">ACERTOS</small>
      </div>`;
    card.querySelector(".info-btn").onclick = () => abrirPopover("Meta de Acertos (1ª Fase)", "Defina sua meta pessoal de acertos (0–36), somando Matemática + Física + Química. Inglês não conta ponto na 1ª fase, apenas elimina.");
    const input = $(".meta-input", card);
    const commitAndRefresh = () => {
      let v = Math.round(Number(input.value));
      if (isNaN(v)) v = meta;
      v = Math.min(36, Math.max(0, v));
      input.value = v;
      if (p.metaAcertosIta !== v) {
        p.metaAcertosIta = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => {
      if (committed) return;
      committed = true;
      commitAndRefresh();
    };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    return card;
  }

  // Meta Redação do painel Provão Paulista (escala 0–20, mesma da redação da 3ª série).
  function metaCardRedacaoInputProvao(p, data) {
    const min = PDB.maxRedacao * PDB.regras.redacaoMinEstaduaisPct;
    const metaRed = p.metaRedacaoProvao != null ? p.metaRedacaoProvao : min;
    const card = el("div", { class: "meta-card prov-status meta-redacao" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">Meta Redação</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="${PDB.maxRedacao}" step="0.1" value="${metaRed}">
        <small style="font-size:14px;font-weight:600">PONTOS</small>
      </div>`;
    card.querySelector(".info-btn").onclick = () => abrirPopover("Meta Redação", "Defina sua meta pessoal de nota em redação. A escala é de 0 a " + PDB.maxRedacao + " pontos.");
    const input = $(".meta-input", card);
    const commitAndRefresh = () => {
      let v = Number(input.value);
      if (isNaN(v)) v = metaRed;
      v = Math.min(PDB.maxRedacao, Math.max(0, v));
      input.value = v;
      if (p.metaRedacaoProvao !== v) {
        p.metaRedacaoProvao = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => {
      if (committed) return;
      committed = true;
      commitAndRefresh();
    };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    return card;
  }

  /* ---------- Linha de edição inline ---------- */
  function buildEditRow(p, data, s) {
    const tr = el("tr", { class: "row-input" });
    tr.innerHTML = `
      <td><input class="cell" data-ef="titulo" value="${esc(s.titulo)}"></td>
      <td><input class="cell small" data-ef="acertos" type="number" min="0" max="90" value="${s.acertos}"></td>
      <td><input class="cell small" data-ef="hum"  type="number" min="0" max="24" value="${s.hum}"></td>
      <td><input class="cell small" data-ef="nat"  type="number" min="0" max="24" value="${s.nat}"></td>
      <td><input class="cell small" data-ef="ling" type="number" min="0" max="24" value="${s.ling}"></td>
      <td><input class="cell small" data-ef="red"  type="number" min="0" max="28" value="${s.red}"></td>
      <td colspan="3" class="num" style="color:var(--navy-soft);font-size:12px">editando…</td>`;
    const tdActions = el("td");
    const save = el("button", { class: "btn-add-row", title: "Salvar" }, "✔");
    save.onclick = async () => {
      const get = (f) => $(`[data-ef="${f}"]`, tr);
      const titulo = get("titulo").value.trim();
      const num = (f, max) => {
        const v = get(f).value;
        if (v === "") return NaN;
        const n = Number(v);
        return (isNaN(n) || n < 0 || n > max) ? null : n;
      };
      const acertos = num("acertos", 90), hum = num("hum", 24), nat = num("nat", 24),
            ling = num("ling", 24), red = num("red", 28);
      if (!titulo) return alert('Dê um título ao simulado.');
      for (const [v, nome, max] of [[acertos,"Acertos",90],[hum,"Humanas",24],[nat,"Nat/Mat",24],[ling,"Linguagens",24],[red,"Redação",28]]) {
        if (v === null || (typeof v === "number" && isNaN(v))) return alert(`"${nome}" deve ser um número entre 0 e ${max}.`);
      }
      const { error } = await SB.from("simulados_unesp").update({ titulo, acertos, hum, nat, ling, red }).eq("id", s.id);
      if (error) return alert("Não foi possível salvar as alterações. Tente novamente.");
      Object.assign(s, { titulo, acertos, hum, nat, ling, red });
      editingRow = null;
      Store.saveUserData(data);
      renderApp();
    };
    const cancel = el("button", { class: "btn-del-row", title: "Cancelar" }, "✕");
    cancel.onclick = () => { editingRow = null; renderApp(); };
    tdActions.append(save, cancel);
    tr.appendChild(tdActions);
    return tr;
  }

  /* ---------- Tabela ---------- */
  function buildTable(p, data) {
    const wrap = el("div", { class: "table-wrap" });
    const t = el("table", { class: "sim" });
    t.innerHTML = `<thead><tr>
      <th>Simulado</th>
      <th>Acertos<br>1ª Fase</th>
      <th>Humanas</th><th>Nat/Mat</th><th>Linguag.</th><th>Redação</th>
      <th>Nota 1ª</th><th>Nota 2ª</th><th>Média</th><th></th>
    </tr></thead>`;
    const tb = el("tbody");

    if (!p.simulados.length) {
      tb.appendChild(el("tr", {}, `<td colspan="10"><div class="empty-hint">Nenhum simulado registrado ainda. Use a linha abaixo para adicionar o primeiro. 👇</div></td>`));
    }
    p.simulados.forEach(s => {
      if (editingRow === s.id) {
        tb.appendChild(buildEditRow(p, data, s));
        return;
      }
      const acertosCls = s.acertos >= p.metaObjetiva ? "status-ok" : "status-bad";
      const metaRedAtual = p.metaRedacao != null ? p.metaRedacao : META_REDACAO;
      const redCls = s.red >= metaRedAtual ? "status-ok" : "status-bad";
      const tr = el("tr");
      tr.innerHTML = `
        <td>${esc(s.titulo)}</td>
        <td class="num ${acertosCls}">${s.acertos}</td>
        <td class="num">${s.hum}</td><td class="num">${s.nat}</td>
        <td class="num">${s.ling}</td><td class="num ${redCls}">${s.red}</td>
        <td class="num calc-cell">${r1(notaF1(s.acertos))}</td>
        <td class="num calc-cell">${r1(notaF2(s))}</td>
        <td class="num calc-cell">${r1(mediaFinal(s))}</td>`;
      const tdActions = el("td");
      const edit = el("button", { class: "btn-del-row", title: "Editar" }, "✎");
      edit.onclick = () => { editingRow = s.id; renderApp(); };
      const del = el("button", { class: "btn-del-row", title: "Remover" }, "🗑");
      del.onclick = async () => {
        const { error } = await SB.from("simulados_unesp").delete().eq("id", s.id);
        if (error) { alert("Não foi possível remover o simulado. Tente novamente."); return; }
        p.simulados = p.simulados.filter(x => x.id !== s.id);
        Store.saveUserData(data); renderApp();
      };
      tdActions.append(edit, del);
      tr.appendChild(tdActions);
      tb.appendChild(tr);
    });

    // Linha de input (sempre em branco no fim)
    const inp = el("tr", { class: "row-input" });
    inp.innerHTML = `
      <td><input class="cell" data-f="titulo" placeholder="Ex: Simulado Anglo 1"></td>
      <td><input class="cell small" data-f="acertos" type="number" min="0" max="90"></td>
      <td><input class="cell small" data-f="hum"  type="number" min="0" max="24"></td>
      <td><input class="cell small" data-f="nat"  type="number" min="0" max="24"></td>
      <td><input class="cell small" data-f="ling" type="number" min="0" max="24"></td>
      <td><input class="cell small" data-f="red"  type="number" min="0" max="28"></td>
      <td colspan="3" class="num" style="color:var(--navy-soft);font-size:12px">cálculo automático</td>
      <td></td>`;
    tb.appendChild(inp);
    t.appendChild(tb);
    wrap.appendChild(t);

    // Botão de adicionar
    const extra = el("div");
    extra.style.marginTop = "14px";
    const addBtn = el("button", { class: "btn btn-primary" }, "Adicionar simulado");
    extra.appendChild(addBtn);
    const errLine = el("div", { class: "error-msg hidden" });
    extra.insertBefore(errLine, addBtn);
    wrap.appendChild(extra);

    inp.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); addBtn.click(); }
    });

    addBtn.onclick = async () => {
      const get = (f) => $(`[data-f="${f}"]`, wrap);
      const titulo = get("titulo").value.trim();
      const num = (f, max) => {
        const v = get(f).value;
        if (v === "") return NaN;
        const n = Number(v);
        return (isNaN(n) || n < 0 || n > max) ? null : n;
      };
      const acertos = num("acertos", 90), hum = num("hum", 24), nat = num("nat", 24),
            ling = num("ling", 24), red = num("red", 28);
      const showLine = (m) => { errLine.textContent = m; errLine.classList.remove("hidden"); };
      if (!titulo) return showLine("Dê um título ao simulado.");
      for (const [v, nome, max] of [[acertos,"Acertos",90],[hum,"Humanas",24],[nat,"Nat/Mat",24],[ling,"Linguagens",24],[red,"Redação",28]]) {
        if (isNaN(v)) return showLine(`Preencha o campo "${nome}".`);
        if (v === null) return showLine(`"${nome}" deve ser um número entre 0 e ${max}.`);
      }
      const { data: row, error } = await SB.from("simulados_unesp").insert({
        painel_id: p.id, titulo, acertos, hum, nat, ling, red,
      }).select().single();
      if (error) { console.error("[Nauka] Falha ao salvar simulado_unesp:", error); return showLine("Não foi possível salvar o simulado. Tente novamente."); }
      p.simulados.push({
        id: row.id, titulo: row.titulo, acertos: Number(row.acertos), hum: Number(row.hum),
        nat: Number(row.nat), ling: Number(row.ling), red: Number(row.red),
      });
      Store.saveUserData(data);
      renderApp();
    };

    return wrap;
  }

  /* ---------- Gráfico (Chart.js) ---------- */
  function drawChart(p) {
    const cv = document.getElementById("evoChart");
    if (!cv || typeof Chart === "undefined") return;
    if (chart) { chart.destroy(); chart = null; }
    const labels = p.simulados.map(s => s.titulo);
    const medias = p.simulados.map(s => Math.round(mediaFinal(s) * 10) / 10);

    chart = new Chart(cv.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Média Final", data: medias,
            borderColor: "#8b5cf6", backgroundColor: "#8b5cf6",
            borderWidth: 3, pointRadius: 5, pointBackgroundColor: "#8b5cf6",
            tension: .25, fill: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { color: "#000", lineWidth: 1.5 } },
          y: { min: 0, max: 100, ticks: { stepSize: 20 }, grid: { color: "#000", lineWidth: 1.5 } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  /* ============================================================
     8) MODAL: NOVO PAINEL
     ============================================================ */
  function openNovoPainel() {
    const data = Store.userData();
    const state = { faculdade: "UNESP", curso: null, cidade: null, entrada: null, modalidade: "SU" };

    const body = el("div");

    // Faculdade
    const facWrap = el("div", { class: "field" });
    facWrap.innerHTML = `<label><span class="step-num">1</span>Faculdade</label>`;
    const facGrid = el("div", { class: "fac-grid" });
    const facs = [["UNESP", true], ["FUVEST", false], ["UNICAMP", false], ["ENEM", false]];
    facs.forEach(([nome, on]) => {
      const o = el("div", { class: "fac-opt" + (on ? " selected" : " disabled") },
        on ? nome : `${nome}<span class="soon">Em breve</span>`);
      facGrid.appendChild(o);
    });
    facWrap.appendChild(facGrid);
    body.appendChild(facWrap);

    // Curso (autocomplete)
    const cursoWrap = el("div", { class: "field" });
    cursoWrap.innerHTML = `<label><span class="step-num">2</span>Curso</label>`;
    const ac = el("div", { class: "autocomplete" });
    const cursoInput = el("input", { class: "input", placeholder: "Digite para buscar (ex.: Direito)", autocomplete: "off" });
    ac.appendChild(cursoInput);
    const acList = el("div", { class: "ac-list hidden" });
    ac.appendChild(acList);
    cursoWrap.appendChild(ac);
    body.appendChild(cursoWrap);

    // Campus
    const campusWrap = el("div", { class: "field hidden" });
    campusWrap.innerHTML = `<label>Campus</label><select class="select"></select>`;
    body.appendChild(campusWrap);

    // Período
    const periodoWrap = el("div", { class: "field hidden" });
    periodoWrap.innerHTML = `<label>Período</label><select class="select"></select>`;
    body.appendChild(periodoWrap);

    // Modalidade
    const modWrap = el("div", { class: "field" });
    modWrap.innerHTML = `<label><span class="step-num">3</span>Modalidade de concorrência</label>`;
    const tg = el("div", { class: "toggle-group" });
    const optSU = el("div", { class: "toggle-opt selected" }, `Ampla Concorrência<small>SU</small>`);
    const optCota = el("div", { class: "toggle-opt" }, `Cotas / Reserva<small>SRVEBP</small>`);
    optSU.onclick = () => { state.modalidade = "SU"; optSU.classList.add("selected"); optCota.classList.remove("selected"); };
    optCota.onclick = () => { state.modalidade = "SRVEBP"; optCota.classList.add("selected"); optSU.classList.remove("selected"); };
    tg.append(optSU, optCota);
    modWrap.appendChild(tg);
    body.appendChild(modWrap);

    const err = el("div", { class: "error-msg hidden" });
    body.appendChild(err);

    // --- Autocomplete behavior ---
    const todos = cursosUnicos();
    function fillAC(term) {
      acList.innerHTML = "";
      const t = term.trim().toLowerCase();
      const matches = t ? todos.filter(c => c.toLowerCase().includes(t)) : todos;
      if (!matches.length) {
        acList.appendChild(el("div", { class: "ac-empty" }, "Nenhum curso encontrado."));
      } else {
        matches.forEach(c => {
          const item = el("div", { class: "ac-item" }, esc(c));
          item.onmousedown = (e) => { e.preventDefault(); pickCurso(c); };
          acList.appendChild(item);
        });
      }
      acList.classList.remove("hidden");
    }
    cursoInput.onfocus = () => fillAC(cursoInput.value);
    cursoInput.oninput = () => { state.curso = null; resetCampus(); fillAC(cursoInput.value); };
    cursoInput.onblur = () => setTimeout(() => acList.classList.add("hidden"), 150);

    function pickCurso(c) {
      state.curso = c;
      cursoInput.value = c;
      acList.classList.add("hidden");
      const cidades = cidadesDoCurso(c);
      const sel = $("select", campusWrap);
      sel.innerHTML = "";
      cidades.forEach(cid => sel.appendChild(el("option", { value: cid }, esc(cid))));
      campusWrap.classList.remove("hidden");
      sel.onchange = () => pickCidade(sel.value);
      pickCidade(cidades[0]);
    }
    function pickCidade(cid) {
      state.cidade = cid;
      const entradas = entradasDe(state.curso, cid);
      const psel = $("select", periodoWrap);
      if (entradas.length > 1) {
        psel.innerHTML = "";
        entradas.forEach(e => psel.appendChild(el("option", { value: e.id }, esc(e.periodo || "único"))));
        periodoWrap.classList.remove("hidden");
        psel.onchange = () => { state.entrada = entradas.find(e => e.id === psel.value); };
        state.entrada = entradas[0];
      } else {
        periodoWrap.classList.add("hidden");
        state.entrada = entradas[0];
      }
    }
    function resetCampus() {
      state.cidade = null; state.entrada = null;
      campusWrap.classList.add("hidden");
      periodoWrap.classList.add("hidden");
    }

    // --- Salvar ---
    async function salvar() {
      if (!state.curso || !state.entrada) {
        err.textContent = "Selecione um curso (e o campus) da lista."; err.classList.remove("hidden"); return;
      }
      const e = state.entrada;
      const { data: row, error } = await SB.from("paineis_unesp").insert({
        user_id: Store.getSession(),
        curso_id: e.id, curso: state.curso, cidade: state.cidade,
        periodo: e.periodo, rotulo: e.rotulo, modalidade: state.modalidade,
        meta_objetiva: e.notas_corte[state.modalidade],
      }).select().single();
      if (error) {
        err.textContent = "Não foi possível criar o painel. Tente novamente."; err.classList.remove("hidden"); return;
      }
      const painel = {
        id: row.id, faculdade: "UNESP",
        cursoId: row.curso_id, curso: row.curso, cidade: row.cidade,
        periodo: row.periodo, rotulo: row.rotulo, modalidade: row.modalidade,
        metaObjetiva: Number(row.meta_objetiva), simulados: [], cadernoErros: {},
      };
      data.paineis.push(painel);
      data.ativo = painel.id;
      Store.saveUserData(data);
      closeModal();
      renderApp();
    }

    openModal("Novo Painel de Foco", body, salvar, "Criar painel");
  }

  /* ============================================================
     8b) MODAL: PROVÃO PAULISTA
     ============================================================ */
  function openProvaoModal() {
    const data = Store.userData();
    const state = { universidade: "", area: "" };

    const body = el("div");

    // Universidade
    const uniWrap = el("div", { class: "field" });
    uniWrap.innerHTML = `<label><span class="step-num">1</span>Universidade</label>`;
    const uniSel = el("select", { class: "select" });
    uniSel.appendChild(el("option", { value: "" }, "Selecione..."));
    PDB.universidades.forEach(u => uniSel.appendChild(el("option", { value: u }, u)));
    uniWrap.appendChild(uniSel);
    body.appendChild(uniWrap);

    // Área Alvo / Eixo (dinâmico)
    const areaWrap = el("div", { class: "field" });
    areaWrap.innerHTML = `<label><span class="step-num">2</span>Área Alvo / Eixo</label>`;
    const areaSel = el("select", { class: "select" });
    areaSel.disabled = true;
    areaSel.appendChild(el("option", { value: "" }, "Escolha a universidade primeiro"));
    areaWrap.appendChild(areaSel);
    body.appendChild(areaWrap);

    const err = el("div", { class: "error-msg hidden" });
    body.appendChild(err);

    // onChange universidade → reseta a área (prevenção de bug de consistência)
    uniSel.onchange = () => {
      state.universidade = uniSel.value;
      state.area = "";
      areaSel.innerHTML = "";
      const areas = PDB.areasPorUni[uniSel.value];
      if (!areas) {
        areaSel.disabled = true;
        areaSel.appendChild(el("option", { value: "" }, "Escolha a universidade primeiro"));
        return;
      }
      areaSel.disabled = false;
      areaSel.appendChild(el("option", { value: "" }, "Selecione..."));
      areas.forEach(a => areaSel.appendChild(el("option", { value: a }, a)));
    };
    areaSel.onchange = () => { state.area = areaSel.value; };

    async function salvar() {
      if (!state.universidade) { err.textContent = "Selecione a universidade."; err.classList.remove("hidden"); return; }
      if (!state.area) { err.textContent = "Selecione a área alvo / eixo."; err.classList.remove("hidden"); return; }
      const { data: row, error } = await SB.from("paineis_provao_paulista").insert({
        user_id: Store.getSession(), universidade: state.universidade, area: state.area,
      }).select().single();
      if (error) {
        err.textContent = "Não foi possível criar o painel. Tente novamente."; err.classList.remove("hidden"); return;
      }
      const painel = {
        id: row.id, tipo: "provao",
        universidade: row.universidade, area: row.area,
        notas: { s1: null, s2: null, s3: { ling: null, mat: null, cn: null, ch: null, red: null } },
      };
      data.paineis.push(painel);
      data.ativo = painel.id;
      Store.saveUserData(data);
      closeModal();
      renderApp();
    }

    openModal("Configurar Provão Paulista", body, salvar, "Criar painel");
  }

  /* ============================================================
     8c) DASHBOARD: PROVÃO PAULISTA
     ============================================================ */
  function renderProvao(p, data) {
    const wrap = el("div");

    // Cabeçalho do painel
    const head = el("div", { class: "provao-head" });
    head.innerHTML = `<h3>Provão Paulista Seriado</h3>`;
    wrap.appendChild(head);

    if (activeSection === "analise") {
      wrap.appendChild(analiseIndisponivelCard("Análise não disponível ainda para o Provão Paulista Seriado."));
      return wrap;
    }

    // --- Cards de status (topo) ---
    const nf = provNotaFinal(p);
    const cicloPct = provCicloPreenchido(p);
    const apt = provStatusAptidao(p);
    const red = provStatusRedacao(p);

    const status = el("div", { class: "meta-cards" });
    status.appendChild(provStatusCard("neutro", "Pontuação Acumulada Parcial",
      `${r1(nf)} <small style="font-size:13px;font-weight:600">/ 100</small>`,
      `${r1(cicloPct)}% do ciclo preenchido`));
    status.appendChild(provStatusCard(apt.estado, "Status de Aptidão (3ª série)",
      apt.estado === "ok" ? "Apto ✔" : apt.estado === "bad" ? "Inapto ✘" : "Pendente",
      apt.txt));
    status.appendChild(provStatusCard(red.estado, "Status da Redação",
      red.estado === "ok" ? "Válida ✔" : red.estado === "bad" ? "Inválida ✘" : "Pendente",
      red.txt));
    status.appendChild(metaCardRedacaoInputProvao(p, data));
    wrap.appendChild(status);

    // --- Percurso (timeline horizontal, 3 cards) ---
    const perc = el("div", { class: "card" });
    const titleDivProv = el("div", { style: "display:flex;align-items:center;justify-content:space-between;" });
    const h3Prov = el("h3", {}, "Seu Percurso no Provão Paulista");
    const infoHistBtnProv = el("button", { style: "background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;" });
    infoHistBtnProv.innerHTML = QUESTION_ICON;
    infoHistBtnProv.onclick = () => abrirPopover("Seu Percurso no Provão Paulista", "Preencha as notas de cada série e salve o histórico oficial.");
    titleDivProv.appendChild(h3Prov);
    titleDivProv.appendChild(infoHistBtnProv);
    perc.appendChild(titleDivProv);

    const timeline = el("div", { class: "provao-timeline" });

    // Linha 1: 1ª e 2ª Série lado a lado (horizontal)
    const row12 = el("div", { class: "provao-row-12" });

    // Card 1 — 1ª Série (15%)
    const c1 = el("div", { class: "serie-card" });
    c1.innerHTML = `<div class="serie-tag">1ª Série <span class="peso">Peso 15%</span></div>
      <div class="serie-sub">Nota Geral (0–90)</div>`;
    const in1 = el("input", { class: "serie-input", type: "number", min: "0", max: "90", "data-p": "s1" });
    if (p.notas.s1 != null) in1.value = p.notas.s1;
    c1.appendChild(in1);
    row12.appendChild(c1);

    // Card 2 — 2ª Série (25%)
    const c2 = el("div", { class: "serie-card" });
    c2.innerHTML = `<div class="serie-tag">2ª Série <span class="peso">Peso 25%</span></div>
      <div class="serie-sub">Nota Geral (0–90)</div>`;
    const in2 = el("input", { class: "serie-input", type: "number", min: "0", max: "90", "data-p": "s2" });
    if (p.notas.s2 != null) in2.value = p.notas.s2;
    c2.appendChild(in2);
    row12.appendChild(c2);

    timeline.appendChild(row12);

    // Linha 2: 3ª Série (60%) — abaixo, largura total, campos empilhados na vertical
    const c3 = el("div", { class: "serie-card serie-card-lg" });
    c3.innerHTML = `<div class="serie-tag">3ª Série <span class="peso">Peso 60%</span></div>
      <div class="serie-sub">Notas por área + redação</div>`;
    const campos = [
      ["ling", "Linguagens", 24], ["mat", "Matemática", 18],
      ["cn", "C. da Natureza", 24], ["ch", "C. Humanas", 24],
      ["red", "Redação", 20],
    ];
    const grid3 = el("div", { class: "serie3-grid" });
    campos.forEach(([k, label, max]) => {
      const f = el("div", { class: "serie3-field" });
      f.appendChild(el("label", {}, `${label} <span class="mx">(0–${max})</span>`));
      const inp = el("input", { class: "cell", type: "number", min: "0", max: String(max), "data-p3": k });
      if (p.notas.s3[k] != null) inp.value = p.notas.s3[k];
      f.appendChild(inp);
      grid3.appendChild(f);
    });
    c3.appendChild(grid3);

    // Resultado da objetiva (Nota_3_Obj, 0–40) — atualiza ao vivo enquanto o aluno digita
    const objResult = el("div", { class: "obj-result" });
    c3.appendChild(objResult);
    function refreshObj() {
      const s3 = {};
      ["ling", "mat", "cn", "ch"].forEach(k => { s3[k] = $(`[data-p3="${k}"]`, c3).value; });
      const v = calcNota3Obj(p.universidade, p.area, s3);
      objResult.innerHTML = `Nota objetiva ponderada (3ª série)<br>
        <strong>${v == null ? "—" : r1(v)}</strong> <span>/ 40 pts</span>`;
    }
    ["ling", "mat", "cn", "ch"].forEach(k => {
      $(`[data-p3="${k}"]`, c3).addEventListener("input", refreshObj);
    });
    refreshObj();

    timeline.appendChild(c3);

    perc.appendChild(timeline);

    const errLine = el("div", { class: "error-msg hidden" });
    perc.appendChild(errLine);

    // Botão salvar (centralizado)
    const salvarWrap = el("div", { class: "provao-save" });
    const salvarBtn = el("button", { class: "btn btn-primary" }, "Salvar Histórico Oficial");
    salvarWrap.appendChild(salvarBtn);
    perc.appendChild(salvarWrap);
    wrap.appendChild(perc);

    salvarBtn.onclick = async () => {
      const readNum = (inp, max) => {
        const v = inp.value;
        if (v === "") return null;
        const n = Number(v);
        return (isNaN(n) || n < 0 || n > max) ? undefined : n; // undefined = inválido
      };
      const v1 = readNum(in1, 90), v2 = readNum(in2, 90);
      const s3vals = {};
      let invalido = false;
      campos.forEach(([k, , max]) => {
        const val = readNum($(`[data-p3="${k}"]`, c3), max);
        if (val === undefined) invalido = true;
        s3vals[k] = val === undefined ? null : val;
      });
      if (v1 === undefined || v2 === undefined || invalido) {
        errLine.textContent = "Verifique os valores: respeite os limites de cada campo.";
        errLine.classList.remove("hidden");
        return;
      }
      const { error } = await SB.from("paineis_provao_paulista").update({
        nota_s1: v1, nota_s2: v2,
        s3_ling: s3vals.ling, s3_mat: s3vals.mat, s3_cn: s3vals.cn, s3_ch: s3vals.ch, s3_red: s3vals.red,
      }).eq("id", p.id);
      if (error) {
        errLine.textContent = "Não foi possível salvar no servidor. Tente novamente.";
        errLine.classList.remove("hidden");
        return;
      }
      p.notas.s1 = v1;
      p.notas.s2 = v2;
      p.notas.s3 = s3vals;
      Store.saveUserData(data);
      renderApp();
    };

    return wrap;
  }

  function provStatusCard(estado, label, value, sub) {
    const cls = estado === "ok" ? "meta-ok" : estado === "bad" ? "meta-bad"
      : estado === "pendente" ? "meta-pendente" : "meta-neutro";
    return el("div", { class: "meta-card prov-status " + cls },
      `<div class="meta-label">${label}</div>
       <div class="meta-value">${value}</div><div class="meta-sub">${sub}</div>`);
  }

  /* ============================================================
     8f) DASHBOARD: ITA
     ============================================================ */
  const ITA_CAMPOS = [
    ["matF1", "mat_f1", "Mat F1", 12, 1, (v) => itaStatus(v, IDB.fase1.minAcertosMateria)],
    ["fisF1", "fis_f1", "Fís F1", 12, 1, (v) => itaStatus(v, IDB.fase1.minAcertosMateria)],
    ["quiF1", "qui_f1", "Quí F1", 12, 1, (v) => itaStatus(v, IDB.fase1.minAcertosMateria)],
    ["ingF1", "ing_f1", "Ing F1", 12, 1, (v) => itaStatus(v, IDB.fase1.minAcertosMateria)],
    ["matF2", "mat_f2", "Mat F2", 10, 0.01, (v) => itaStatus(v, IDB.fase2.minNotaDissertativa)],
    ["fisF2", "fis_f2", "Fís F2", 10, 0.01, (v) => itaStatus(v, IDB.fase2.minNotaDissertativa)],
    ["quiF2", "qui_f2", "Quí F2", 10, 0.01, (v) => itaStatus(v, IDB.fase2.minNotaDissertativa)],
    ["portObj", "port_obj", "Port Obj", 15, 1, (v) => itaStatusPortObj(v)],
    ["redacao", "redacao", "Redação", 10, 0.01, (v) => itaStatus(v, IDB.fase2.minRedacao)],
  ];

  function renderIta(p, data) {
    const wrap = el("div");
    const view = activeSection === "analise" ? "analise" : "geral";

    const head = el("div", { class: "provao-head" });
    head.innerHTML = `<h3>ITA — Instituto Tecnológico de Aeronáutica</h3>`;
    wrap.appendChild(head);

    if (view === "geral") {
      const cards = el("div", { class: "meta-cards meta-cards-duo" });
      cards.appendChild(metaCardAcertosInputIta(p, data));
      cards.appendChild(metaCardRedacaoInputIta(p, data));
      wrap.appendChild(cards);
    }

    if (view === "geral") {
      const tableCard = el("div", { class: "card" });
      const titleDivIta = el("div", { style: "display:flex;align-items:center;justify-content:space-between;" });
      const h3Ita = el("h3", {}, "Histórico de Ciclos");
      const infoHistBtnIta = el("button", { style: "background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;" });
      infoHistBtnIta.innerHTML = QUESTION_ICON;
      infoHistBtnIta.onclick = () => abrirPopover("Histórico de Ciclos", "Fase 1: mínimo 5 acertos em cada disciplina (Inglês inclusive, só eliminatório). Fase 2: mínimo 4,00 em cada dissertativa; Português elimina com redação < 4,00 ou acertos ≤ 5.");
      titleDivIta.appendChild(h3Ita);
      titleDivIta.appendChild(infoHistBtnIta);
      tableCard.appendChild(titleDivIta);
      tableCard.appendChild(el("div", { class: "legend-row" },
        `<span class="legend-chip chip-ok">✔ Dentro do mínimo</span>
         <span class="legend-chip chip-bad">✘ Abaixo do mínimo / eliminado</span>
         <span class="legend-chip chip-laranja">Mínimo de 18 acertos na soma das disciplinas que contam pontos para 1ª fase</span>`));
      tableCard.appendChild(buildItaTable(p, data));
      wrap.appendChild(tableCard);
    } else {
      if (p.simulados.length) {
        const medias = p.simulados.map(s => itaMediaGeral(s));
        const melhor = Math.max(...medias);
        const evolucao = medias.length > 1 ? medias[medias.length - 1] - medias[0] : 0;
        const kpis = el("div", { class: "kpi-row" });
        kpis.appendChild(kpiCard("Melhor Média Geral", r4(melhor) + " / " + r4(10)));
        kpis.appendChild(kpiCard("Ciclos registrados", String(p.simulados.length)));
        kpis.appendChild(kpiCard("Evolução (1º → último)", (evolucao >= 0 ? "+" : "") + r4(evolucao),
          evolucao > 0 ? "kpi-up" : evolucao < 0 ? "kpi-down" : ""));
        wrap.appendChild(kpis);
      }

      const chartCard = el("div", { class: "card" });
      chartCard.appendChild(el("h3", {}, "Evolução da Média Geral"));
      chartCard.appendChild(el("p", { class: "card-sub" }, "Evolução da sua média em cada ciclo registrado."));
      const box = el("div", { class: "chart-box chart-box-lg" });
      const canvas = el("canvas", { id: "evoChartIta" });
      box.appendChild(canvas);
      chartCard.appendChild(box);
      wrap.appendChild(chartCard);
      setTimeout(() => drawItaChart(p), 0);
    }
    return wrap;
  }

  /* ---------- Linha de edição inline (ITA) ---------- */
  function buildItaEditRow(p, data, s) {
    const tr = el("tr", { class: "row-input" });
    const inputHtml = ([key, , , max, step]) =>
      `<td><input class="cell small" data-ief="${key}" type="number" min="0" max="${max}" step="${step}" value="${s[key]}"></td>`;
    let tds = `<td><input class="cell" data-ief="titulo" value="${esc(s.titulo)}"></td>`;
    ITA_CAMPOS.slice(0, 4).forEach(c => { tds += inputHtml(c); });
    tds += `<td class="num" style="color:var(--navy-soft);font-size:12px">editando…</td>`;
    ITA_CAMPOS.slice(4).forEach(c => { tds += inputHtml(c); });
    tds += `<td colspan="2" class="num" style="color:var(--navy-soft);font-size:12px">editando…</td>`;
    tr.innerHTML = tds;
    const tdActions = el("td");
    const save = el("button", { class: "btn-add-row", title: "Salvar" }, "✔");
    save.onclick = async () => {
      const get = (f) => $(`[data-ief="${f}"]`, tr);
      const titulo = get("titulo").value.trim();
      if (!titulo) return alert("Dê um título ao ciclo.");
      const vals = {};
      for (const [key, , label, max] of ITA_CAMPOS) {
        const v = get(key).value;
        if (v === "") return alert(`Preencha o campo "${label}".`);
        const n = Number(v);
        if (isNaN(n) || n < 0 || n > max) return alert(`"${label}" deve ser um número entre 0 e ${max}.`);
        vals[key] = n;
      }
      const dbVals = {};
      ITA_CAMPOS.forEach(([key, col]) => { dbVals[col] = vals[key]; });
      const { error } = await SB.from("simulados_ita").update({ titulo, ...dbVals }).eq("id", s.id);
      if (error) return alert("Não foi possível salvar as alterações. Tente novamente.");
      Object.assign(s, { titulo, ...vals });
      editingRow = null;
      Store.saveUserData(data);
      renderApp();
    };
    const cancel = el("button", { class: "btn-del-row", title: "Cancelar" }, "✕");
    cancel.onclick = () => { editingRow = null; renderApp(); };
    tdActions.append(save, cancel);
    tr.appendChild(tdActions);
    return tr;
  }

  /* ---------- Tabela (ITA) ---------- */
  function buildItaTable(p, data) {
    const wrap = el("div", { class: "table-wrap" });
    const t = el("table", { class: "sim" });
    const camposF1 = ITA_CAMPOS.slice(0, 4);
    const camposF2 = ITA_CAMPOS.slice(4);
    let ths = "<th>Ciclo</th>";
    camposF1.forEach(([, , label]) => { ths += `<th>${label}</th>`; });
    ths += "<th>Nota F1</th>";
    camposF2.forEach(([, , label]) => { ths += `<th>${label}</th>`; });
    ths += "<th>MFPP</th><th>Média Geral</th><th></th>";
    t.innerHTML = `<thead><tr>${ths}</tr></thead>`;
    const tb = el("tbody");
    const totalCols = ITA_CAMPOS.length + 5;

    if (!p.simulados.length) {
      tb.appendChild(el("tr", {}, `<td colspan="${totalCols}"><div class="empty-hint">Nenhum ciclo registrado ainda. Use a linha abaixo para adicionar o primeiro. 👇</div></td>`));
    }
    p.simulados.forEach(s => {
      if (editingRow === s.id) {
        tb.appendChild(buildItaEditRow(p, data, s));
        return;
      }
      const f1 = itaNotaF1(s), mfpp = itaMFPP(s), media = itaMediaGeral(s);
      const f1Cls = itaCls(itaStatus(f1, IDB.fase1.notaMinAprovacao));
      const metaRed = itaMetaRedacao(p);
      const cellHtml = ([key, , , , , statusFn]) => {
        const st = key === "redacao" ? itaStatus(s[key], metaRed) : statusFn(s[key]);
        return `<td class="num ${itaCls(st)}">${s[key]}</td>`;
      };
      let tds = `<td>${esc(s.titulo)}</td>`;
      camposF1.forEach(c => { tds += cellHtml(c); });
      tds += `<td class="num calc-cell ${f1Cls}">${r4(f1)}</td>`;
      camposF2.forEach(c => { tds += cellHtml(c); });
      tds += `<td class="num calc-cell">${r4(mfpp)}</td>
        <td class="num calc-cell">${r4(media)}</td>`;
      const tr = el("tr");
      tr.innerHTML = tds;
      const tdActions = el("td");
      const edit = el("button", { class: "btn-del-row", title: "Editar" }, "✎");
      edit.onclick = () => { editingRow = s.id; renderApp(); };
      const del = el("button", { class: "btn-del-row", title: "Remover" }, "🗑");
      del.onclick = async () => {
        const { error } = await SB.from("simulados_ita").delete().eq("id", s.id);
        if (error) { alert("Não foi possível remover o ciclo. Tente novamente."); return; }
        p.simulados = p.simulados.filter(x => x.id !== s.id);
        Store.saveUserData(data); renderApp();
      };
      tdActions.append(edit, del);
      tr.appendChild(tdActions);
      tb.appendChild(tr);
    });

    // Linha de input (sempre em branco no fim)
    const inp = el("tr", { class: "row-input" });
    const inputHtml = ([key, , , max, step]) =>
      `<td><input class="cell small" data-if="${key}" type="number" min="0" max="${max}" step="${step}"></td>`;
    let inpTds = `<td><input class="cell" data-if="titulo" placeholder="Ex: Ciclo 1"></td>`;
    camposF1.forEach(c => { inpTds += inputHtml(c); });
    inpTds += `<td class="num" style="color:var(--navy-soft);font-size:12px">auto</td>`;
    camposF2.forEach(c => { inpTds += inputHtml(c); });
    inpTds += `<td colspan="2" class="num" style="color:var(--navy-soft);font-size:12px">cálculo automático</td><td></td>`;
    inp.innerHTML = inpTds;
    tb.appendChild(inp);
    t.appendChild(tb);
    wrap.appendChild(t);

    // Botão de adicionar
    const extra = el("div");
    extra.style.marginTop = "14px";
    const addBtn = el("button", { class: "btn btn-primary" }, "Adicionar ciclo");
    extra.appendChild(addBtn);
    const errLine = el("div", { class: "error-msg hidden" });
    extra.insertBefore(errLine, addBtn);
    wrap.appendChild(extra);

    inp.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); addBtn.click(); }
    });

    addBtn.onclick = async () => {
      const get = (f) => $(`[data-if="${f}"]`, wrap);
      const titulo = get("titulo").value.trim();
      const showLine = (m) => { errLine.textContent = m; errLine.classList.remove("hidden"); };
      if (!titulo) return showLine("Dê um título ao ciclo.");
      const vals = {};
      for (const [key, , label, max] of ITA_CAMPOS) {
        const v = get(key).value;
        if (v === "") return showLine(`Preencha o campo "${label}".`);
        const n = Number(v);
        if (isNaN(n) || n < 0 || n > max) return showLine(`"${label}" deve ser um número entre 0 e ${max}.`);
        vals[key] = n;
      }
      const dbVals = {};
      ITA_CAMPOS.forEach(([key, col]) => { dbVals[col] = vals[key]; });
      const { data: row, error } = await SB.from("simulados_ita").insert({
        painel_id: p.id, titulo, ...dbVals,
      }).select().single();
      if (error) { console.error("[Nauka] Falha ao salvar simulados_ita:", error); return showLine("Não foi possível salvar o ciclo. Tente novamente."); }
      const novo = { id: row.id, titulo: row.titulo };
      ITA_CAMPOS.forEach(([key, col]) => { novo[key] = Number(row[col]); });
      p.simulados.push(novo);
      Store.saveUserData(data);
      renderApp();
    };

    return wrap;
  }

  /* ---------- Gráfico (ITA) ---------- */
  let chartIta = null;
  function drawItaChart(p) {
    const cv = document.getElementById("evoChartIta");
    if (!cv || typeof Chart === "undefined") return;
    if (chartIta) { chartIta.destroy(); chartIta = null; }
    const labels = p.simulados.map(s => s.titulo);
    const medias = p.simulados.map(s => Math.round(itaMediaGeral(s) * 10000) / 10000);

    chartIta = new Chart(cv.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Média Geral", data: medias,
            borderColor: "#8b5cf6", backgroundColor: "#8b5cf6",
            borderWidth: 3, pointRadius: 5, pointBackgroundColor: "#8b5cf6",
            tension: .25, fill: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { color: "#000", lineWidth: 1.5 } },
          y: { min: 0, max: 10, ticks: { stepSize: 1 }, grid: { color: "#000", lineWidth: 1.5 } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  /* ============================================================
     8g) DASHBOARD: FUVEST MEDICINA (USP)
     ============================================================ */

  // Card 1 — Meta pessoal 1ª Fase (editável, 0–90 acertos)
  function metaCardObjetivaInputFm(p, data) {
    const meta = p.metaObjetiva != null ? p.metaObjetiva : 0;
    const card = el("div", { class: "meta-card meta-objetiva" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">1ª Fase — Meta pessoal</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="90" value="${meta}">
        <small style="font-size:14px;font-weight:600">ACERTOS</small>
      </div>`;
    const input = $(".meta-input", card);
    const commitAndRefresh = async () => {
      let v = Math.round(Number(input.value));
      if (isNaN(v)) v = meta;
      v = Math.min(90, Math.max(0, v));
      input.value = v;
      if (p.metaObjetiva !== v) {
        const { error } = await SB.from("paineis_fuvest_medicina").update({ meta_objetiva: v }).eq("id", p.id);
        if (!error) p.metaObjetiva = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => { if (committed) return; committed = true; commitAndRefresh(); };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    const infoBtn = card.querySelector(".info-btn");
    infoBtn.onclick = () => abrirPopover("1ª Fase — Meta pessoal", "Defina sua meta de acertos na primeira fase. O corte oficial é de " + fmCorte1Fase(p) + " acertos.");
    return card;
  }

  // Card 2 — Meta pessoal Redação (editável, 0–50)
  function metaCardRedacaoInputFm(p, data) {
    const meta = p.metaRedacao != null ? p.metaRedacao : 0;
    const card = el("div", { class: "meta-card meta-redacao" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">Redação — Meta pessoal</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="50" step="0.01" value="${meta}">
        <small style="font-size:14px;font-weight:600">PONTOS</small>
      </div>`;
    const input = $(".meta-input", card);
    const commitAndRefresh = async () => {
      let v = Number(input.value);
      if (isNaN(v)) v = meta;
      v = Math.min(50, Math.max(0, v));
      input.value = v;
      if (p.metaRedacao !== v) {
        const { error } = await SB.from("paineis_fuvest_medicina").update({ meta_redacao: v }).eq("id", p.id);
        if (!error) p.metaRedacao = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => { if (committed) return; committed = true; commitAndRefresh(); };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    const infoBtn2 = card.querySelector(".info-btn");
    infoBtn2.onclick = () => abrirPopover("Redação — Meta pessoal", "Defina sua meta de pontuação em redação. A escala é de 0 a 50 pontos.");
    return card;
  }

  // Card 3 — Meta pessoal 2ª Fase (semi-editável): pré-preenchido com a Nota da 1ª chamada
  // FUVEST 2026 do campus/modalidade selecionados. É o alvo (Nota Final, 0–1000) usado
  // para colorir a coluna "Nota Final" do histórico de simulados.
  function metaCardSegundaFaseInputFm(p, data) {
    const meta = p.metaSegundaFase;
    const card = el("div", { class: "meta-card meta-segunda-fase" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">2ª Fase — Meta pessoal</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value meta-value-input">
        <input type="number" class="meta-input" min="0" max="1000" step="0.01" value="${meta}">
        <small style="font-size:14px;font-weight:600">/ 1000</small>
      </div>`;
    const input = $(".meta-input", card);
    const commitAndRefresh = async () => {
      let v = Number(input.value);
      if (isNaN(v)) v = meta;
      v = Math.min(1000, Math.max(0, v));
      input.value = v;
      if (p.metaSegundaFase !== v) {
        const { error } = await SB.from("paineis_fuvest_medicina").update({ meta_segunda_fase: v }).eq("id", p.id);
        if (!error) p.metaSegundaFase = v;
        Store.saveUserData(data);
      }
      renderApp();
    };
    let committed = false;
    const commitOnce = () => { if (committed) return; committed = true; commitAndRefresh(); };
    input.addEventListener("blur", commitOnce);
    input.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); commitOnce(); }
    });
    const infoBtn3 = card.querySelector(".info-btn");
    infoBtn3.onclick = () => abrirPopover("2ª Fase — Meta pessoal", "Sua meta final baseada na última chamada da FUVEST. Você pode ajustá-la conforme achar necessário. A escala é de 0 a 1000 pontos.");
    return card;
  }

  // Card 4 — Referência fixa (não editável): última nota da 1ª chamada FUVEST 2026
  function metaCardReferenciaFm(p) {
    const valor = fmNotaPrimeiraChamada(p);
    const card = el("div", { class: "meta-card meta-referencia" });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="meta-label">1ª Chamada FUVEST 2026 — Referência</div>
        <button class="info-btn" style="background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;">${QUESTION_ICON}</button>
      </div>
      <div class="meta-value">${r1000(valor)}<small style="font-size:13px;font-weight:600"> / 1000</small></div>`;
    const infoBtn4 = card.querySelector(".info-btn");
    infoBtn4.onclick = () => abrirPopover("1ª Chamada FUVEST 2026 — Referência", "Esta é a menor nota registrada entre aprovados na última chamada da FUVEST. É o piso histórico de quem conseguiu vaga.");
    return card;
  }

  function abrirPopover(titulo, conteudo, target) {
    const existing = document.getElementById("popover-container");
    if (existing) existing.remove();
    const container = el("div", { class: "popover-container", id: "popover-container" });
    const pop = el("div", { class: "popover" });
    pop.innerHTML = `<div class="popover-head"><strong>${esc(titulo)}</strong><button class="popover-close" style="background:none;border:none;font-size:18px;cursor:pointer;">&times;</button></div><div class="popover-body">${conteudo}</div>`;
    const closeBtn = pop.querySelector(".popover-close");
    closeBtn.onclick = () => container.remove();
    container.appendChild(pop);
    container.onclick = (e) => { if (e.target === container) container.remove(); };
    document.body.appendChild(container);
  }

  function renderFuvestMedicina(p, data) {
    const wrap = el("div");
    const view = activeSection === "analise" ? "analise" : "geral";

    const head = el("div", { class: "provao-head" });
    head.innerHTML = `<h3>Medicina USP — ${esc(p.campus)}</h3>
      <p class="card-sub">FUVEST · ${esc(FMDB.modalidadeLabel[p.modalidade])} · Corte 1ª Fase: ${fmCorte1Fase(p)} acertos · Corte Nota Final (3ª chamada 2025): ${r1000(fmCorteNotaFinal(p))} / 1000</p>`;
    wrap.appendChild(head);

    if (view === "geral") {
      const cards = el("div", { class: "meta-cards" });
      cards.appendChild(metaCardObjetivaInputFm(p, data));
      cards.appendChild(metaCardRedacaoInputFm(p, data));
      cards.appendChild(metaCardSegundaFaseInputFm(p, data));
      cards.appendChild(metaCardReferenciaFm(p));
      wrap.appendChild(cards);
    }

    const subnav = el("div", { class: "panel-subnav" });
    const avisoBtn = el("button", { class: "btn-analise" }, "⚠️ Aviso de Corte");
    avisoBtn.onclick = (e) => { e.preventDefault(); abrirAvisoCorte(); };
    subnav.appendChild(avisoBtn);
    wrap.appendChild(subnav);

    if (view === "geral") {
      const tableCard = el("div", { class: "card" });
      const titleDiv = el("div", { style: "display:flex;align-items:center;justify-content:space-between;" });
      const h3 = el("h3", {}, "Histórico de Simulados");
      const infoHistBtn = el("button", { style: "background:none;border:none;cursor:pointer;padding:0;line-height:0;opacity:0.85;" });
      infoHistBtn.innerHTML = QUESTION_ICON;
      infoHistBtn.onclick = () => abrirPopover("Histórico de Simulados", "Registre seus simulados para acompanhar seu progresso. Cada simulado é comparado com sua meta final na 2ª fase.");
      titleDiv.appendChild(h3);
      titleDiv.appendChild(infoHistBtn);
      tableCard.appendChild(titleDiv);
      tableCard.appendChild(el("div", { class: "legend-row" },
        `<span class="legend-chip chip-ok">✔ Dentro da meta</span>
         <span class="legend-chip chip-bad">✘ Abaixo da meta</span>`));
      tableCard.appendChild(buildFmTable(p, data));
      wrap.appendChild(tableCard);
    } else {
      if (p.simulados.length) {
        const notas = p.simulados.map(s => fmNotaFinal(s));
        const melhor = Math.max(...notas);
        const evolucao = notas.length > 1 ? notas[notas.length - 1] - notas[0] : 0;
        const kpis = el("div", { class: "kpi-row" });
        kpis.appendChild(kpiCard("Melhor Nota Final", r1000(melhor) + " / 1000"));
        kpis.appendChild(kpiCard("Simulados registrados", String(p.simulados.length)));
        kpis.appendChild(kpiCard("Evolução (1º → último)", (evolucao >= 0 ? "+" : "") + r1000(evolucao),
          evolucao > 0 ? "kpi-up" : evolucao < 0 ? "kpi-down" : ""));
        wrap.appendChild(kpis);
      }

      const chartCard = el("div", { class: "card" });
      chartCard.appendChild(el("h3", {}, "Evolução da Nota Final"));
      chartCard.appendChild(el("p", { class: "card-sub" }, "Evolução da sua Nota Final em cada simulado registrado."));
      const box = el("div", { class: "chart-box chart-box-lg" });
      const canvas = el("canvas", { id: "evoChartFm" });
      box.appendChild(canvas);
      chartCard.appendChild(box);
      wrap.appendChild(chartCard);
      setTimeout(() => drawFmChart(p), 0);
    }
    return wrap;
  }

  const FM_CAMPOS = [
    ["acertos", "acertos", "Acertos F1", 90, 1],
    ["portugues", "portugues", "Português", 50, 0.01],
    ["redacao", "redacao", "Redação", 50, 0.01],
    ["d2", "d2", "D2", 100, 0.01],
  ];
  const FM_CAMPO = Object.fromEntries(FM_CAMPOS.map(c => [c[0], c]));
  const fmAutoTd = `<td class="num" style="color:var(--navy-soft);font-size:12px">auto</td>`;
  // attr = "data-fef" (linha de edição, com valor preenchido) ou "data-ff" (linha nova, vazia)
  const fmInputTd = (attr, key, value) => {
    const [, , , max, step] = FM_CAMPO[key];
    return `<td><input class="cell small" ${attr}="${key}" type="number" min="0" max="${max}" step="${step}"${value != null ? ` value="${value}"` : ""}></td>`;
  };

  /* ---------- Linha de edição inline (Medicina USP) ---------- */
  function buildFmEditRow(p, data, s) {
    const tr = el("tr", { class: "row-input" });
    let tds = `<td><input class="cell" data-fef="titulo" value="${esc(s.titulo)}"></td>`;
    tds += fmInputTd("data-fef", "acertos", s.acertos);
    tds += fmAutoTd; // Nota F1
    tds += fmInputTd("data-fef", "portugues", s.portugues);
    tds += fmInputTd("data-fef", "redacao", s.redacao);
    tds += fmAutoTd; // D1
    tds += fmInputTd("data-fef", "d2", s.d2);
    tds += fmAutoTd; // Nota Final
    tr.innerHTML = tds;
    const tdActions = el("td");
    const save = el("button", { class: "btn-add-row", title: "Salvar" }, "✔");
    save.onclick = async () => {
      const get = (f) => $(`[data-fef="${f}"]`, tr);
      const titulo = get("titulo").value.trim();
      if (!titulo) return alert("Dê um título ao simulado.");
      const vals = {};
      for (const [key, , label, max] of FM_CAMPOS) {
        const v = get(key).value;
        if (v === "") return alert(`Preencha o campo "${label}".`);
        const n = Number(v);
        if (isNaN(n) || n < 0 || n > max) return alert(`"${label}" deve ser um número entre 0 e ${max}.`);
        vals[key] = n;
      }
      if (vals.portugues + vals.redacao > 100) return alert("Português + Redação (D1) não pode passar de 100 pontos.");
      const dbVals = {};
      FM_CAMPOS.forEach(([key, col]) => { dbVals[col] = vals[key]; });
      const { error } = await SB.from("simulados_fuvest_medicina").update({ titulo, ...dbVals }).eq("id", s.id);
      if (error) return alert("Não foi possível salvar as alterações. Tente novamente.");
      Object.assign(s, { titulo, ...vals });
      editingRow = null;
      Store.saveUserData(data);
      renderApp();
    };
    const cancel = el("button", { class: "btn-del-row", title: "Cancelar" }, "✕");
    cancel.onclick = () => { editingRow = null; renderApp(); };
    tdActions.append(save, cancel);
    tr.appendChild(tdActions);
    return tr;
  }

  /* ---------- Tabela (Medicina USP) ---------- */
  function buildFmTable(p, data) {
    const wrap = el("div", { class: "table-wrap" });
    const t = el("table", { class: "sim" });
    const ths = "<th>Simulado</th><th>Acertos F1</th><th>Nota F1</th><th>Português</th><th>Redação</th><th>D1</th><th>D2</th><th>Nota Final</th><th></th>";
    t.innerHTML = `<thead><tr>${ths}</tr></thead>`;
    const tb = el("tbody");
    const totalCols = 9;

    if (!p.simulados.length) {
      tb.appendChild(el("tr", {}, `<td colspan="${totalCols}"><div class="empty-hint">Nenhum simulado registrado ainda. Use a linha abaixo para adicionar o primeiro. 👇</div></td>`));
    }
    p.simulados.forEach(s => {
      if (editingRow === s.id) {
        tb.appendChild(buildFmEditRow(p, data, s));
        return;
      }
      const nf1 = fmNF1(s.acertos), d1 = fmD1(s), d2 = fmD2(s), notaFinal = fmNotaFinal(s);
      const acertosCls = fmCls(s.acertos, p.metaObjetiva);
      const redCls = fmCls(s.redacao, p.metaRedacao);
      const finalCls = fmCls(notaFinal, p.metaSegundaFase);
      let tds = `<td>${esc(s.titulo)}</td>
        <td class="num ${acertosCls}">${s.acertos}</td>
        <td class="num calc-cell">${r1000(nf1)}</td>
        <td class="num">${s.portugues}</td>
        <td class="num ${redCls}">${s.redacao}</td>
        <td class="num calc-cell">${r1000(d1)}</td>
        <td class="num">${s.d2}</td>
        <td class="num calc-cell ${finalCls}">${r1000(notaFinal)}</td>`;
      const tr = el("tr");
      tr.innerHTML = tds;
      const tdActions = el("td");
      const edit = el("button", { class: "btn-del-row", title: "Editar" }, "✎");
      edit.onclick = () => { editingRow = s.id; renderApp(); };
      const del = el("button", { class: "btn-del-row", title: "Remover" }, "🗑");
      del.onclick = async () => {
        const { error } = await SB.from("simulados_fuvest_medicina").delete().eq("id", s.id);
        if (error) { alert("Não foi possível remover o simulado. Tente novamente."); return; }
        p.simulados = p.simulados.filter(x => x.id !== s.id);
        Store.saveUserData(data); renderApp();
      };
      tdActions.append(edit, del);
      tr.appendChild(tdActions);
      tb.appendChild(tr);
    });

    const inp = el("tr", { class: "row-input" });
    let inpTds = `<td><input class="cell" data-ff="titulo" placeholder="Ex: Simulado 1"></td>`;
    inpTds += fmInputTd("data-ff", "acertos");
    inpTds += fmAutoTd; // Nota F1
    inpTds += fmInputTd("data-ff", "portugues");
    inpTds += fmInputTd("data-ff", "redacao");
    inpTds += fmAutoTd; // D1
    inpTds += fmInputTd("data-ff", "d2");
    inpTds += fmAutoTd; // Nota Final
    inpTds += `<td></td>`;
    inp.innerHTML = inpTds;
    tb.appendChild(inp);
    t.appendChild(tb);
    wrap.appendChild(t);

    const extra = el("div");
    extra.style.marginTop = "14px";
    const addBtn = el("button", { class: "btn btn-primary" }, "Adicionar simulado");
    extra.appendChild(addBtn);
    const errLine = el("div", { class: "error-msg hidden" });
    extra.insertBefore(errLine, addBtn);
    wrap.appendChild(extra);

    inp.addEventListener("keydown", (ev) => {
      const isEnter = ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13;
      if (isEnter) { ev.preventDefault(); addBtn.click(); }
    });

    addBtn.onclick = async () => {
      const get = (f) => $(`[data-ff="${f}"]`, wrap);
      const titulo = get("titulo").value.trim();
      const showLine = (m) => { errLine.textContent = m; errLine.classList.remove("hidden"); };
      if (!titulo) return showLine("Dê um título ao simulado.");
      const vals = {};
      for (const [key, , label, max] of FM_CAMPOS) {
        const v = get(key).value;
        if (v === "") return showLine(`Preencha o campo "${label}".`);
        const n = Number(v);
        if (isNaN(n) || n < 0 || n > max) return showLine(`"${label}" deve ser um número entre 0 e ${max}.`);
        vals[key] = n;
      }
      if (vals.portugues + vals.redacao > 100) return showLine("Português + Redação (D1) não pode passar de 100 pontos.");
      const dbVals = {};
      FM_CAMPOS.forEach(([key, col]) => { dbVals[col] = vals[key]; });
      const { data: row, error } = await SB.from("simulados_fuvest_medicina").insert({
        painel_id: p.id, titulo, ...dbVals,
      }).select().single();
      if (error) { console.error("[Nauka] Falha ao salvar simulados_fuvest_medicina:", error); return showLine("Não foi possível salvar o simulado. Tente novamente."); }
      const novo = { id: row.id, titulo: row.titulo };
      FM_CAMPOS.forEach(([key, col]) => { novo[key] = Number(row[col]); });
      p.simulados.push(novo);
      Store.saveUserData(data);
      renderApp();
    };

    return wrap;
  }

  /* ---------- Gráfico (Medicina USP) ---------- */
  let chartFm = null;
  function drawFmChart(p) {
    const cv = document.getElementById("evoChartFm");
    if (!cv || typeof Chart === "undefined") return;
    if (chartFm) { chartFm.destroy(); chartFm = null; }
    const labels = p.simulados.map(s => s.titulo);
    const notas = p.simulados.map(s => Math.round(fmNotaFinal(s) * 100) / 100);

    chartFm = new Chart(cv.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Nota Final", data: notas,
            borderColor: "#8b5cf6", backgroundColor: "#8b5cf6",
            borderWidth: 3, pointRadius: 5, pointBackgroundColor: "#8b5cf6",
            tension: .25, fill: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { min: 0, max: 1000, ticks: { stepSize: 100 } } },
        plugins: { legend: { display: false } },
      },
    });
  }

  /* ============================================================
     9) MODAL: PERFIL
     ============================================================ */
  /* ============================================================
     10) MODAL genérico
     ============================================================ */
  function openModal(titulo, bodyEl, onSave, saveLabel) {
    closeModal();
    const back = el("div", { class: "modal-backdrop", id: "modal-back" });
    const modal = el("div", { class: "modal" });
    const head = el("div", { class: "modal-head" });
    head.innerHTML = `<h2>${esc(titulo)}</h2>`;
    const x = el("button", { class: "close-x" }, "×");
    x.onclick = closeModal;
    head.appendChild(x);
    const body = el("div", { class: "modal-body" });
    body.appendChild(bodyEl);
    modal.append(head, body);
    if (onSave) {
      const foot = el("div", { class: "modal-foot" });
      const cancel = el("button", { class: "btn btn-ghost" }, "Cancelar");
      cancel.onclick = closeModal;
      const save = el("button", { class: "btn btn-primary" }, saveLabel || "Salvar");
      save.onclick = onSave;
      foot.append(cancel, save);
      modal.append(foot);
    }
    back.appendChild(modal);
    back.onclick = (e) => { if (e.target === back) closeModal(); };
    document.body.appendChild(back);
  }
  function closeModal() {
    const b = document.getElementById("modal-back");
    if (b) b.remove();
  }

  function abrirAvisoCorte() {
    closeModal();
    const back = el("div", { class: "modal-backdrop", id: "modal-back" });
    const modal = el("div", { class: "modal aviso-modal" });
    const head = el("div", { class: "modal-head" });
    head.innerHTML = `<h2>⚠️ Aviso sobre os cortes exibidos</h2>`;
    const x = el("button", { class: "close-x" }, "×");
    x.onclick = closeModal;
    head.appendChild(x);
    const body = el("div", { class: "modal-body" });
    body.innerHTML = `
      <p>Os valores exibidos representam a menor nota final registrada entre os aprovados na última chamada de matrícula — não o mínimo absoluto para participar da 2ª fase.</p>
      <p>Na prática, é o <strong>piso histórico</strong> de quem conseguiu vaga. Candidatos próximos a esse valor correm risco.</p>
      <div class="aviso-highlight">Recomendamos buscar uma margem de segurança acima desse número.</div>
      <p style="margin-top:14px">As notas tendem a ser consistentes entre edições, tornando esses dados uma referência confiável para o planejamento do seu estudo.</p>
    `;
    const foot = el("div", { class: "modal-foot" });
    const ok = el("button", { class: "btn-entendi" }, "Entendi");
    ok.onclick = closeModal;
    foot.appendChild(ok);
    modal.append(head, body, foot);
    back.appendChild(modal);
    back.onclick = (e) => { if (e.target === back) closeModal(); };
    document.body.appendChild(back);
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  document.addEventListener("DOMContentLoaded", boot);
})();
