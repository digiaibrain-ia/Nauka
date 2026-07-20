// Chatbot Widget JS - Nauka / Lili

(function() {
  const SUPABASE_URL = 'https://pmtmnqbufodeksrpxxud.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdG1ucWJ1Zm9kZWtzcnB4eHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMzY5MzQsImV4cCI6MjA5OTgxMjkzNH0.mX-T-eJHiP5yJAsmfe9NDXQ5WBGolVgRZ6pzQKO--6A';
  const AVATAR_PATH = 'assets/img/lili-icon.png'; // ajusta o caminho se salvar em outro lugar

  class ChatbotWidget {
    constructor() {
      this.isOpen = false;
      this.init();
    }

    init() {
      this.createHTML();
      this.attachEventListeners();
    }

    createHTML() {
      const html = `
        <div class="chatbot-widget">
          <button class="chatbot-bubble" id="chatbot-bubble" aria-label="Abrir chat com a Lili">
            <img src="${AVATAR_PATH}" alt="Lili">
          </button>

          <div class="chatbot-container" id="chatbot-container">
            <div class="chatbot-header">
              <img src="${AVATAR_PATH}" alt="Lili">
              <h3>Lili</h3>
              <button class="chatbot-close" id="chatbot-close" aria-label="Fechar chat">✕</button>
            </div>

            <div class="chatbot-messages" id="chatbot-messages"></div>

            <div class="chatbot-input-area">
              <input
                type="text"
                class="chatbot-input"
                id="chatbot-input"
                placeholder="Pergunta sobre organização de estudos..."
                autocomplete="off"
              >
              <button class="chatbot-send" id="chatbot-send" aria-label="Enviar">→</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', html);

      // Mensagem inicial de boas-vindas
      this.addMessage('Oi! Sou a Lili 🐾 Posso te ajudar a organizar seus estudos, planejar a correção dos simulados ou pensar em métodos de estudo. No que posso ajudar?', 'bot');
    }

    attachEventListeners() {
      document.getElementById('chatbot-bubble').addEventListener('click', () => this.toggle());
      document.getElementById('chatbot-close').addEventListener('click', () => this.close());
      document.getElementById('chatbot-send').addEventListener('click', () => this.sendMessage());
      document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    open() {
      this.isOpen = true;
      document.getElementById('chatbot-container').classList.add('active');
      document.getElementById('chatbot-input').focus();
    }

    close() {
      this.isOpen = false;
      document.getElementById('chatbot-container').classList.remove('active');
    }

    async sendMessage() {
      const input = document.getElementById('chatbot-input');
      const message = input.value.trim();
      if (!message) return;

      this.addMessage(message, 'user');
      input.value = '';
      input.disabled = true;

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/chatbot-lili`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ message }),
          }
        );

        const data = await response.json();
        const botReply = data.reply || 'Desculpa, não consegui responder agora.';
        this.addMessage(botReply, 'bot');
      } catch (error) {
        console.error('Erro ao chamar chatbot:', error);
        this.addMessage('Erro ao conectar com o assistente. Tente novamente.', 'bot');
      } finally {
        input.disabled = false;
        input.focus();
      }
    }

    addMessage(text, sender) {
      const messagesDiv = document.getElementById('chatbot-messages');
      const messageEl = document.createElement('div');
      messageEl.className = `chatbot-message ${sender}`;

      const contentEl = document.createElement('div');
      contentEl.className = 'chatbot-message-content';
      contentEl.textContent = text;

      messageEl.appendChild(contentEl);
      messagesDiv.appendChild(messageEl);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  // Só deve aparecer depois que o aluno faz login (nunca na landing/onboarding).
  // app.js chama show()/hide() conforme a tela ativa.
  let instance = null;
  function show() {
    if (!instance) instance = new ChatbotWidget();
    document.querySelector('.chatbot-widget').style.display = '';
  }
  function hide() {
    const el = document.querySelector('.chatbot-widget');
    if (el) el.style.display = 'none';
  }
  window.NaukaChatbot = { show, hide };
})();
