/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    GEMINI_API_KEY: string;
    NODE_ENV: 'development' | 'production';
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
