# Tarefa: adicionar sidebar de navegação

## Objetivo
Adicionar uma sidebar vertical fixa à esquerda no site, como complemento à interface
atual — não como substituição. Nada que já existe deve ser removido.

## O que NÃO pode ser removido ou alterado
- Cabeçalho/topo atual da página
- Nome do usuário exibido
- Botão de sair
- As pills de seleção de vestibular/curso (continuam no topo, dentro do painel Início), apenas no painel inicio. Quando um novo usuario criar uma conta e não tiver nenhum painel mas clicar no icone da side bar, deve aparecer a mesma mensagem inicial de sugerir a criação de um painel, a não ser que o usuario clique em algum icone que não seja diretamente relacionado aos paineis, como o de configuraão e perfil.
- Painel com meta 1ª fase, meta redação e histórico de simulados (continua como está)

## O que deve ser feito
1. Criar uma sidebar vertical fixa à esquerda da tela, com ícones empilhados de cima
   para baixo.
2. Cor principal da sidebar: o mesmo azul escuro já usado na margem superior do site.
3. Itens da sidebar, nesta ordem, cada um com ícone e tooltip com o nome ao passar o
   mouse:
   - Início (ícone de casa) — leva ao painel que já existe hoje (pills + metas +
     histórico de simulados), sem nenhuma alteração de conteúdo
   - Análise — atualmente é um botão dentro do painel que leva a outra página; deve
     passar a ser um item da sidebar, e ao ser clicado troca apenas o conteúdo central,
     sem recarregar a página
   - Caderno de erros — mesma lógica do item Análise: sai de dentro do painel e vira
     item da sidebar, trocando apenas o conteúdo central
   - Configurações (ícone de engrenagem) — novo item, painel vazio por enquanto
   - Perfil (ícone de usuário) — novo item, painel com as informações do antigo botão de perfil que sera removido com a adição dda sidebar
4. Os ícones novos (Configurações e Perfil) ficam na sequência normal dos outros itens,
   não separados ou fixados embaixo.
5. Comportamento contextual: a sidebar reage ao vestibular/curso selecionado nas pills.
   Ou seja, se o aluno estiver em Análise ou Caderno de erros e trocar a pill de
   vestibular, o conteúdo exibido deve atualizar para refletir o vestibular
   selecionado.
6. As pills de vestibular só aparecem dentro do painel Início — nos demais painéis
   (Análise, Caderno de erros, Configurações, Perfil) elas não aparecem.

## Detalhes visuais
- Ícones alinhados verticalmente, centralizados na largura da sidebar, com espaçamento
  regular entre eles.
- Item ativo (painel atualmente aberto) tem destaque visual claro (ex: fundo mais
  escuro ou cor de texto diferente) em relação aos demais.
- Ao passar o mouse sobre um ícone, exibir um pequeno rótulo de texto com o nome do
  item (tooltip).
- A sidebar deve ter largura suficiente só para os ícones (não é uma sidebar com
  texto ao lado, é só ícones).

## Comportamento de navegação
- Nenhum clique na sidebar deve recarregar a página ou navegar para uma URL diferente.
- A troca de conteúdo deve ser feita trocando o que aparece na área central, mantendo
  a sidebar sempre fixa e visível.

## Dúvidas
Se qualquer decisão de estrutura de banco de dados, layout ou remoção de elemento
existente não estiver clara, perguntar antes de implementar.
