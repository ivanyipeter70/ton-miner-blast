interface TelegramWebApp {
  initDataUnsafe?: {
    user?: {
      first_name?: string;
    };
  };
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
