# Projeto Nauka

## O que é o projeto

Nauka é um site de preparação para vestibulares. Cada vestibular tem sua própria aba/seção,
com dados específicos (notas de corte, estrutura da prova, cotas) daquele processo seletivo.

## Estado atual

* ✅ Front-end da aba **Provão Paulista** — implementado
* ✅ Front-end da aba **UNESP** — implementado
* 🚧 Em andamento: aba **FUVEST**, começando pela **FUVEST Medicina** (tratamento
diferenciado por ser um curso com perfil de candidato e exigências distintas), aba ITA, e outras independente de ser publica ou particular ou militar
* ❌ Ainda não implementado: banco de dados, autenticação de usuários, salvamento de
progresso/histórico do aluno, forma de pagamento...

## Como os dados chegam

Os dados de cada vestibular vêm de cartilhas oficiais e outras fontes, que são
minerados e organizados (fora do Claude Code) antes de virarem instruções de
implementação. O formato do arquivo de origem pode ser PDF, Word (doc/docx) ou
planilha (xlsx/csv) — tanto faz, o importante é ler o conteúdo real do arquivo
indicado. Quando um arquivo com dados estruturados for referenciado, ele deve ser
lido diretamente — os números não devem ser inventados ou aproximados.

## Decisões técnicas já tomadas

* Banco de dados e autenticação: **Supabase** 
* Cada vestibular pode ter lógica própria de cálculo de nota/corte — não assumir que
todos seguem a mesma fórmula
* Onde existem cotas (ex: FUVEST Medicina tem AC / EP-L3 / PPI-L4), os dados de cada
cota devem ficar claramente separados e vinculados à modalidade correta — nunca
misturar notas de cotas diferentes

## Regras para o Claude Code seguir

* Este é o primeiro projeto técnico do responsável pelo produto; ele não programa e
está aprendendo junto. Explicações de acompanhamento (fora do código em si) devem
ser simples e diretas.
* Antes de alterar estrutura de banco de dados (tabelas, colunas, relações) já
existente, explicar o que vai mudar e por quê, e confirmar antes de aplicar.
* Ao mexer em dados sensíveis de usuário (login, senha, respostas de simulado),
priorizar segurança (Row Level Security no Supabase, nunca expor chaves secretas
no front-end).
* Manter front-end e back-end como responsabilidades separadas: mudanças de aparência
não devem exigir mexer em banco de dados, e vice-versa, a menos que seja
explicitamente necessário.
* Nunca excluir nenhum arquivo que não tenha sido pedido explicitamente. Se, durante
o trabalho, parecer necessário excluir algum arquivo, perguntar antes e explicar
o motivo — nunca excluir por conta própria.

