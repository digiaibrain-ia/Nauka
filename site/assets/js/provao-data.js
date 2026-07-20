// Base de dados do Provão Paulista Seriado.
// Fonte: manual_tecnico_provao_paulista.pdf (regras, pesos e critérios oficiais).
// Não editar à mão sem consultar o manual.
window.PROVAO_DB = {
  fonte: "manual_tecnico_provao_paulista.pdf",

  universidades: ["USP", "UNICAMP", "UNESP", "FATEC", "UNIVESP"],

  // Máximo de acertos por área na 3ª série (Provão III) — total 90 questões.
  maxAcertos: { ling: 24, mat: 18, cn: 24, ch: 24 },
  escalaGeral: 90,        // 1ª e 2ª série: nota geral de 0 a 90 acertos
  maxRedacao: 20,         // redação da 3ª série: 0 a 20 (nota real da Vunesp = 20% da NF, entra direto)

  // Pesos do ciclo (composição da nota final)
  pesosCiclo: { serie1: 0.15, serie2: 0.25, serie3Obj: 0.40, redacao: 0.20 },

  // Áreas/eixos disponíveis por universidade
  areasPorUni: {
    USP:     ["Ciências Exatas", "Ciências Biológicas e Saúde", "Ciências Humanas"],
    UNESP:   ["Ciências Exatas", "Ciências Biológicas e Saúde", "Ciências Humanas"],
    UNICAMP: ["Ciências Exatas", "Ciências Biológicas e Saúde", "Ciências Humanas"],
    UNIVESP: ["Eixo de Computação", "Eixo de Licenciatura", "Eixo de Negócios e Produção"],
    FATEC:   [
      "Informação e Comunicação",
      "Gestão e Negócios",
      "Produção Industrial / Controle",
      "Infraestrutura / Edifícios",
      "Ambiente e Saúde / Segurança",
      "Turismo, Hospitalidade e Lazer",
    ],
  },

  // Matriz de pesos por área (3ª série). Chaves: ling, mat, cn, ch (e red p/ UNICAMP).
  pesos: {
    // A) USP e UNESP
    USP: {
      "Ciências Exatas":              { ling: 1, mat: 3, cn: 2, ch: 1 },
      "Ciências Biológicas e Saúde":  { ling: 2, mat: 1, cn: 3, ch: 1 },
      "Ciências Humanas":             { ling: 3, mat: 1, cn: 1, ch: 2 },
    },
    UNESP: {
      "Ciências Exatas":              { ling: 1, mat: 3, cn: 2, ch: 1 },
      "Ciências Biológicas e Saúde":  { ling: 2, mat: 1, cn: 3, ch: 1 },
      "Ciências Humanas":             { ling: 3, mat: 1, cn: 1, ch: 2 },
    },
    // B) UNICAMP (inclui peso de Redação — constante Peso 2 em todas as áreas)
    UNICAMP: {
      "Ciências Exatas":              { ling: 1, mat: 3, cn: 2, ch: 1, red: 2 },
      "Ciências Biológicas e Saúde":  { ling: 2, mat: 1, cn: 3, ch: 1, red: 2 },
      "Ciências Humanas":             { ling: 3, mat: 1, cn: 1, ch: 2, red: 2 },
    },
    // C) UNIVESP (Eixos de Ingresso)
    UNIVESP: {
      "Eixo de Computação":           { ling: 1, mat: 3, cn: 2, ch: 1 },
      "Eixo de Licenciatura":         { ling: 3, mat: 1, cn: 1, ch: 2 },
      "Eixo de Negócios e Produção":  { ling: 2, mat: 2, cn: 1, ch: 1 },
    },
    // D) FATECs (Eixos Tecnológicos)
    FATEC: {
      "Informação e Comunicação":       { ling: 1, mat: 3, cn: 2, ch: 1 },
      "Gestão e Negócios":              { ling: 2, mat: 2, cn: 1, ch: 2 },
      "Produção Industrial / Controle": { ling: 1, mat: 3, cn: 3, ch: 1 },
      "Infraestrutura / Edifícios":     { ling: 1, mat: 3, cn: 2, ch: 1 },
      "Ambiente e Saúde / Segurança":   { ling: 1, mat: 1, cn: 3, ch: 2 },
      "Turismo, Hospitalidade e Lazer": { ling: 3, mat: 1, cn: 1, ch: 2 },
    },
  },

  // Critérios de corte (3ª série)
  regras: {
    estaduais: ["USP", "UNESP", "UNICAMP"],   // corte de 22 acertos na objetiva
    corteObjetivaEstaduais: 22,
    // Redação estaduais: eliminação se nota < 4 pontos (20% de 20 = corte mínimo do edital)
    redacaoMinEstaduaisPct: 0.20,
  },
};
