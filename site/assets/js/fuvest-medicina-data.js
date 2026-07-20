// Regras e cortes de Medicina USP (FUVEST).
// Fonte: fuvest_medicina.md (edital oficial FUVEST 2025 + PDF de notas de corte + 1ª chamada FUVEST 2026).
// Não editar sem consultar o arquivo de origem.
window.FUVEST_MED_DB = {
  fonte: "fuvest_medicina.md",

  campi: ["São Paulo", "Ribeirão Preto", "Bauru"],
  modalidades: ["AC", "EP-L3", "PPI-L4"],
  modalidadeLabel: {
    "AC": "Ampla Concorrência",
    "EP-L3": "Escola Pública (EP-L3)",
    "PPI-L4": "Pretos, Pardos e Indígenas (PPI-L4)",
  },

  // Corte da 1ª fase (acertos, de 90 questões) — unificado para os 3 campi
  corte1Fase: { "AC": 79, "EP-L3": 71, "PPI-L4": 60 },

  // Corte de Nota Final (escala 0–1000) — FUVEST 2025, 3ª chamada. Cada campus × modalidade tem o seu.
  corteNotaFinal: {
    "São Paulo":       { "AC": 826.30, "EP-L3": 773.70, "PPI-L4": 660.74 },
    "Ribeirão Preto":  { "AC": 817.41, "EP-L3": 761.67, "PPI-L4": 665.37 },
    "Bauru":           { "AC": 812.78, "EP-L3": 759.07, "PPI-L4": 648.15 },
  },

  // Nota da 1ª chamada — FUVEST 2026 (dados mais recentes), escala 0–1000
  notaPrimeiraChamada2026: {
    "São Paulo":       { "AC": 850.65, "EP-L3": 791.67, "PPI-L4": 682.50 },
    "Ribeirão Preto":  { "AC": 841.39, "EP-L3": 783.43, "PPI-L4": 670.51 },
    "Bauru":           { "AC": 838.19, "EP-L3": 783.06, "PPI-L4": 663.98 },
  },

  textoCortes: "Os valores exibidos representam a menor nota final registrada entre os aprovados na última chamada de matrícula da FUVEST 2025 — não o mínimo absoluto para participar da 2ª fase. Na prática, é o piso histórico de quem conseguiu vaga. Candidatos próximos a esse valor correm risco. Recomendamos buscar uma margem de segurança acima desse número. As notas tendem a ser consistentes entre edições, tornando esses dados uma referência confiável para o planejamento do seu estudo.",

  textoPrimeiraChamada: "Última nota da 1ª chamada (FUVEST 2026) — candidatos acima deste valor entraram na lista principal sem precisar aguardar chamadas adicionais.",
};
