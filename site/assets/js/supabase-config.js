/* ============================================================
   NAUKA — Conexão com o Supabase (back-end)
   Estas duas informações são PÚBLICAS e podem ficar no front-end:
     - a URL do projeto
     - a chave "publishable" (anon), feita justamente para o navegador
   A chave SECRETA (service_role) NUNCA entra aqui.
   Depende de: @supabase/supabase-js (carregado via CDN antes deste arquivo).
   ============================================================ */
(function () {
  "use strict";

  const SUPABASE_URL = "https://pmtmnqbufodeksrpxxud.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_o8TO3pLdUG0f6MTvCwnlbQ_C1F-btyy";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("[Nauka] Biblioteca do Supabase não carregou. Verifique o <script> do CDN no index.html.");
    return;
  }

  // Cliente único, reaproveitado por todo o site.
  window.NAUKA_SUPABASE = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();
