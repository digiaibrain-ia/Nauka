# Calendário - Especificação Final

## Objetivo
Implementar um calendário funcional no site onde alunos podem visualizar eventos de estudo pessoais e datas oficiais de vestibulares/militares.

---

## Integração no Site

### Menu/Navegação
- **Ícone:** Calendário (Font Awesome `fa-calendar` ou SVG customizado)
- **Localização:** Na sidebar esquerda, **abaixo do ícone de "Caderno de Erros"**
- **Cor do ícone:** Mesma paleta azul-marinho do site (#16213e)
- **Rota:** `/calendario.html` ou `/pages/calendario.html`
- **Acesso:** Apenas após login (mesma restrição que Dashboard, Simulados, etc)

### Página
- **Layout:** Calendário esquerda (60%), painel de eventos direita (40%) em desktop
- **Mobile:** Calendário full-width, eventos embaixo
- **Header:** Mesmo padrão da plataforma ("Foco Vestibular" no topo)
- **Sidebar:** Mesma sidebar preta da esquerda com ícones

---

## Funcionalidades

### 1. Visualização do Calendário
- **Navegação:** Setas < > para trocar mês
- **Botão "Hoje":** Volta pro mês atual e data de hoje
- **Animação:** Slide suave ao trocar mês
- **Dias com eventos:** Mostram bolinhas coloridas (múltiplas se vários eventos)
- **Dias de vestibular/militar:** Fundo preenchido com cor (azul ou roxo), número em branco e espesso

### 2. Eventos do Aluno
- Aluno **clica em um dia** → lateral direita mostra eventos daquele dia
- **Adicionar evento:** Clica em "+ Adicionar evento" → abre modal
  - Campos: Título, Tipo (Simulado/Revisão/Estudo/Prova/Outro), Cor (6 opções fortes)
  - Salva no Supabase: `caderno_erros` (reutiliza a tabela ou cria `eventos_calendario`)
  - Vinculado a: user_id + data

- **Editar evento:** Clica no evento na lateral → abre modal com dados preenchidos
- **Deletar evento:** Botão "Deletar" no modal de edição, com confirmação

### 3. Eventos Oficiais (Vestibulares/Militares)
Aparecem automaticamente, fixos (não editáveis pelo aluno):

**🎓 Vestibulares Públicos (azul #0055ff, fundo preenchido):**
- Unicamp 1ª Fase: 18 de outubro de 2026
- Unicamp 2ª Fase: 29 e 30 de novembro de 2026
- Fuvest 1ª Fase: 1º de novembro de 2026
- Fuvest 2ª Fase: 6 e 7 de dezembro de 2026
- Enem: 8 e 15 de novembro de 2026
- Unesp 1ª Fase: 22 de novembro de 2026
- Unesp 2ª Fase: 13 e 14 de dezembro de 2026

**🪖 Militares (roxo #8800ff, fundo preenchido):**
- EFOMM: 25 e 26 de julho de 2026
- Colégio Naval: 1º e 2 de agosto de 2026
- Escola Naval: 29 e 30 de agosto de 2026
- EsPCEx: 13 de setembro de 2026
- IME 1ª Fase: 20 de setembro de 2026
- IME 2ª Fase: 26 a 29 de outubro de 2026
- ITA 1ª Fase: 27 de setembro de 2026
- ITA 2ª Fase: 20 a 23 de outubro de 2026
- EEAR: 22 de novembro de 2026

---

## Design

### Paleta de Cores
- **Fundo página:** #a9d6d9 (azul petróleo claro)
- **Header calendário:** #16213e (azul-marinho)
- **Fundo card:** #fff (branco)
- **Títulos:** #16213e (azul-marinho, combina com sidebar)
- **Eventos do aluno:** 6 cores fortes (vermelho, azul, verde, amarelo, roxo, laranja)
- **Vestibulares:** #0055ff (azul)
- **Militares:** #8800ff (roxo)

### Tipografia
- **Títulos (h3):** 15px, peso 500, cor #16213e
- **Mês/ano:** 18px, peso 500, branco (no header escuro)
- **Dia do mês:** 14px, **peso 700** (espesso para boa legibilidade)
- **Eventos:** 13px, peso 400

### Responsividade
- Desktop: 2 colunas (calendário + painel lateral)
- Tablet: 1 coluna, eventos embaixo
- Mobile: 1 coluna full-width

---

## Banco de Dados (Supabase)

### Tabela 1: `eventos_calendario` (eventos do aluno)
```sql
CREATE TABLE eventos_calendario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  titulo TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'Outro', -- Simulado, Revisão, Estudo, Prova, Outro
  cor VARCHAR(7) DEFAULT '#e60000', -- hex color
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_eventos_user_data ON eventos_calendario(user_id, data);
```

### Dados Oficiais
Os eventos de vestibulares/militares são **hardcoded no JavaScript** (não vêm do banco). Arquivo: `calendario.js` contém objeto `eventosOficiais` com todas as datas.

---

## Arquivos a Criar/Modificar

### Novos arquivos:
- `site/calendario.html` — página do calendário
- `site/assets/css/calendario.css` — estilos
- `site/assets/js/calendario.js` — lógica (fetch/POST/PUT/DELETE eventos, renderização)

### Modificar:
- `site/assets/js/app.js` — adicionar link "Calendário" no menu (abaixo de "Caderno de Erros")
- Migração Supabase: criar tabela `eventos_calendario`

---

## Protótipo Testado
Um protótipo HTML funcional foi criado (`calendario-prototipo.html`) com toda a lógica em JavaScript vanilla. Este arquivo pode ser usado como **referência visual e comportamental** ao implementar no Claude Code.

---

## Próximos Passos (Fase 2 - Futuro)

1. **Upload de imagem** — aluno pode fotografar a resolução de uma questão errada
2. **Lembretes** — notificação 1 dia antes de evento oficial
3. **Sincronização com simulados** — ao escolher simulado, oferece adicionar ao calendário
4. **Exportar** — PDF, iCal, Google Calendar
5. **Compartilhar** — com professor/tutor
6. **Eventos recorrentes** — estudar segunda/quarta/sexta

---

## Observações Importantes

- **Sem validação de hora** — eventos não têm horário, apenas data
- **Sem descrição** — apenas título, tipo e cor
- **Sem categorias extras** — mantém interface limpa
- **Eventos oficiais não editáveis** — protegidos, aparecem sempre
- **Sem limite de eventos por dia** — aluno pode adicionar quantos quiser
- **Dados locais durante prototipagem** — todos os eventos em memória no protótipo; no site real, vêm do Supabase

---

## Links Úteis para Desenvolvedor
- Supabase docs: https://supabase.com/docs
- Integração com auth: use `supabase.auth.user()` para pegar user_id
- Fetch de dados: `supabase.from('eventos_calendario').select()`
- Insert: `supabase.from('eventos_calendario').insert()`
- Update: `supabase.from('eventos_calendario').update()`
- Delete: `supabase.from('eventos_calendario').delete()`
