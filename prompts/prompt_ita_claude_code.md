# Implementação da aba ITA — Projeto Nauka

## Contexto
O site Nauka já tem as abas **Provão Paulista** e **UNESP** implementadas. Agora vamos adicionar o **ITA** (Instituto Tecnológico de Aeronáutica), seguindo o mesmo padrão visual e estrutural das abas existentes.

## Estrutura de navegação — nova categoria
O ITA não aparece como opção direta no mesmo nível de UNESP/Provão Paulista. Ele fica dentro de uma nova categoria chamada **"Vestibular Militar"**, que por enquanto só tem o ITA como opção — mas foi pensada para receber outros vestibulares militares no futuro (ex: IME, AFA). Estruture o dado/rota já pensando nisso: `categoria: "Vestibular Militar" → vestibular: "ITA"`, não algo hardcoded só para ITA.

## Fonte de dados
Leia o arquivo **`ita_regras.md`**, na pasta `estudo`. Ele já traz as fórmulas e regras extraídas e resumidas — não é a planilha original. Use exatamente essas fórmulas e valores mínimos, sem aproximar ou reinterpretar. Não é necessário abrir nenhuma planilha `.xlsx` para esta implementação.

## O que a interface precisa permitir ao aluno
1. Lançar resultados por ciclo de simulado (histórico contínuo, sem limite fixo de ciclos)
2. Ver a nota calculada automaticamente em tempo real conforme preenche
3. Ver evolução ao longo dos ciclos/simulados (equivalente aos gráficos do Dashboard da planilha)
4. Registrar questões erradas por matéria e por ciclo (equivalente à aba `Questões Erradas`)
5. Ver claramente quando está abaixo do mínimo em alguma matéria (sinalização visual tipo verde/vermelho, como já existe na UNESP)

## Regras que você deve sempre seguir
- Números e fórmulas vêm exclusivamente do `ita_regras.md` — não aproxime nem "arredonde por conta própria" além do que a fórmula já faz
- Mantenha a mesma precisão decimal da planilha (4 casas decimais na Nota F1, MFPP e Média Geral)
- Antes de mudar qualquer estrutura de banco de dados já existente (por conta das outras abas), confirme comigo
- Siga o padrão de nomenclatura de tabelas/campos já usado nas abas UNESP e Provão Paulista, se já existir um padrão — não crie um estilo novo sem necessidade
