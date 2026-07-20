# Prompt de Instrução — Implementação FUVEST Medicina USP

## Contexto do Projeto
Você está trabalhando em um site de preparação para vestibulares. O site já possui implementações funcionais para **UNESP** e **ITA** — use-as como referência estrutural e de padrão visual.

A tarefa agora é implementar a aba **FUVEST — Medicina USP**.

---

## Primeiro passo obrigatório
Antes de escrever qualquer linha de código, leia o arquivo:

```
/estudo/fuvest_medicina.md
```

Este arquivo contém todos os dados oficiais, estrutura da prova, cortes por campus e modalidade, instruções de front-end e mapeamento completo de dados. Ele é a fonte da verdade para esta implementação.

---

## O que implementar

### Fluxo de seleção
Seguir exatamente o mesmo padrão da UNESP, com estas adaptações:

1. Candidato clica em **"Medicina — USP"**
2. Seleciona o **campus:** São Paulo · Ribeirão Preto · Bauru
3. Seleciona a **modalidade:** AC · EP-L3 · PPI-L4
4. O sistema exibe as informações e cards correspondentes

> Não há seleção de período. Medicina USP é sempre integral.

### Cards — 3 no total

| Card | Tipo | Comportamento |
|---|---|---|
| Meta pessoal — 1ª Fase | Editável | Candidato digita os acertos que quer atingir |
| Meta pessoal — Redação | Editável | Candidato digita a nota desejada na redação (0–50) |
| Meta pessoal — 2ª Fase | Semi-editável | Pré-preenchido com a nota da última 1ª chamada (FUVEST 2026) do campus × modalidade selecionados. Candidato pode editar. Este valor alimenta o output. |

### Regra crítica de associação de dados
Cada combinação campus × modalidade tem seu próprio conjunto de dados. **Nunca misturar valores entre campi ou modalidades.** O mapeamento completo está no `fuvest_medicina.md`.

### Texto informativo obrigatório
Exibir junto às informações de corte uma nota explicando que os valores representam a menor nota da última chamada — não o mínimo absoluto. O texto exato está no `fuvest_medicina.md`.

### Antes de implementar — perguntar ao dono do projeto
- Onde posicionar o texto explicativo sobre os cortes na tela
- Onde posicionar o card de referência da 1ª chamada
- Como o output deve ser calculado e exibido a partir do input do card Meta 2ª Fase

---

## Restrições importantes
- Não inventar dados — todos os valores estão no `fuvest_medicina.md`
- Não misturar dados de campus ou modalidade diferentes
- Não adicionar seleção de período
- Seguir o padrão visual e estrutural já existente no site (UNESP como referência)

