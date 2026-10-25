import path from 'node:path';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const configuredApiBaseUrl = (env.VITE_API_BASE_URL || '').trim();
  const configuredProxyTarget = (env.API_PROXY_TARGET || '').trim();
  const proxyTarget = configuredProxyTarget
    || (/^https?:\/\//i.test(configuredApiBaseUrl) ? configuredApiBaseUrl : '')
    || 'https://api.clarkhub.cn';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
