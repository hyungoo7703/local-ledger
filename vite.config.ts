import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { thirdPartyLicenses, LICENSES_FILE } from './vite-plugins/third-party-licenses';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/local-ledger/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      workbox: {
        // 서비스 워커가 모든 페이지 이동을 index.html로 돌리므로, 라이선스 파일은 예외로 둔다.
        // 안 그러면 설정 화면의 링크를 눌러도 앱 화면이 다시 뜬다.
        navigateFallbackDenylist: [new RegExp(`${LICENSES_FILE.replace(/\./g, '\\.')}$`)]
      },
      manifest: {
        name: '로컬 가계부 - 혜택 & 월급 플래너',
        short_name: '로컬가계부',
        description: '할인·혜택 소비 플랜과 월급 분배 규칙을 위한 초간편 모바일 가계부',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    thirdPartyLicenses()
  ]
});
