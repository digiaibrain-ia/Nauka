# Integração do Chatbot Lili — Claude Code

## Tarefa
Integrar o widget de chatbot (Lili) no projeto Nauka HTML/vanilla JS.

## O que já foi feito
- Edge Function no Supabase criada e funcionando (`chatbotnauka-gemini`)
- 3 arquivos do frontend já estão nas pastas corretas:
  - `site/assets/css/chatbot.css` ✅
  - `site/assets/js/chatbot.js` ✅
  - `site/assets/img/lili-icon.png` ✅

## O que falta
Adicionar 2 linhas em cada página HTML onde você quer que o chatbot apareça ( a cada nova pagina criada após a tela de login deve ser integrado o chat box, antes da pagina de login do usuario NÃO DEVE HAVER chat bot, e caso algum painel seja adicionado no site depois dessa inserção o chat box deve estar presente):

1. **No `<head>`** (junto com os outros `<link>`):
```html
<link rel="stylesheet" href="assets/css/chatbot.css">
```

2. **Antes de `</body>`** (junto com os outros `<script>`):
```html
<script src="assets/js/chatbot.js"></script>
```


## Instruções
1. Abrir o arquivo `site/index.html`
2. Adicionar a primeira linha dentro da tag `<head>`
3. Adicionar a segunda linha antes de fechar `</body>`
4. Salvar
5. Se tiver outras páginas HTML (login, dashboard, simulados, etc) que vêm **depois do login**, repete o mesmo para essas também

## Resultado esperado
Após salvar e recarregar a página no navegador, aparece um balãozinho azul claro com a foto da Lili no canto inferior direito. Clicando nele, abre uma caixa de chat. A Lili responde sobre organização de estudos.

## Modelo recomendado
Haiku (tarefa simples, sem lógica complexa)

## Tempo estimado
~2 minutos de Claude Code
