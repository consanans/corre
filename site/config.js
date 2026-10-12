/* CORRE · configuração
   Project URL e chave anon (pública por natureza) do Supabase.
   NUNCA coloque aqui a chave secreta (sb_secret_...) nem a service_role.
   MAPS_EMBED_KEY: chave do Google "Maps Embed API", restrita ao app.corresocial.com (Rolo 360 em 360°).
   CONTATO_PLANO: link pra quem quer o Corre+ (WhatsApp ou e-mail). Vazio esconde o botão. */
window.CORRE_CONFIG = {
  SUPABASE_URL: 'https://jzjsqadcwphqzxfsxxyx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6anNxYWRjd3BocXp4ZnN4eHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMjIxNTEsImV4cCI6MjEwNjg5ODE1MX0.Ys0ASzDtUk4or1uxRfTISFwRubwr40eWqxE8rEpOYmM',
  MAPS_EMBED_KEY: '',
  CONTATO_PLANO: '',
  /* ROBO_URL: o endereço do robô da Binance (app do parceiro), quando ele for ligado. Vazio esconde o botão. */
  ROBO_URL: '',
  /* a função do Mural foi criada no painel com o endereço "swift-api" (o nome "mural" é só o rótulo).
     O site chama a swift-api e, se ela sumir, tenta /functions/v1/mural. Não apaga a swift-api. */
  FUNCOES: { mural: 'swift-api' },
  /* GOOGLE_CLIENT_ID (v3.38): com ele, o "Continuar com o Google" vira o botão do próprio Google e a janela mostra o
     endereço do Corre (não o do Supabase). ANTES de preencher, põe https://app.corresocial.com em "Origens JavaScript
     autorizadas" no cliente OAuth do Google Cloud (o mesmo que tá no Supabase). Vazio = o login de sempre.
     O do Corre: 13190831885-4oi3uvagao6idlbe8vpkkcjq68c9ci9a.apps.googleusercontent.com */
  GOOGLE_CLIENT_ID: '',
  /* IG_APP_ID (v3.40): o "ID do app do Instagram" (público), do app da Meta com o caso de uso do Instagram >
     "Configuração da API com login do Instagram". Com ele, o Studio ganha o "Conectar o Instagram": cada pessoa entra
     na própria conta e escolhe em qual conta cada post sai. O segredo do app NÃO vem pra cá: fica só na função
     "instagram" (IG_APP_SECRET). Vazio = o Conectar avisa que ainda não foi ligado.
     IG_REDIRECT: opcional, o endereço de volta cadastrado na Meta (padrão: este site + /ig.html). */
  IG_APP_ID: ''
};
