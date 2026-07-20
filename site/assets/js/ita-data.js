// Regras de cálculo do ITA.
// Fonte: ita_regras.md (fórmulas e mínimos oficiais resumidos). Não editar sem consultar o arquivo.
window.ITA_DB = {
  fonte: "ita_regras.md",

  fase1: {
    questoesPorMateria: 12,
    minAcertosMateria: 5,       // mínimo em CADA disciplina (Mat, Fís, Quí, Inglês) — abaixo disso, eliminado
    escalaDenominador: 36,      // (Mat + Fís + Quí) / 36 × 10 — Inglês não entra na nota
    notaMinAprovacao: 5,
  },

  fase2: {
    minNotaDissertativa: 4,     // Matemática, Física, Química (0–10 cada)
    questoesObjPortugues: 15,
    minAcertosPortugues: 6,     // elimina se acertos ≤ 5
    minRedacao: 4,              // elimina se redação < 4,00
  },

  pesosMediaGeral: 0.2,         // 5 provas, cada uma 20%: F1, Mat, Fís, Quí, MFPP

  desempate: ["Matemática", "Física", "Química", "Português", "nascimento mais antigo"],
};
