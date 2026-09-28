import { defineConfig } from 'vitest/config';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  // 相对路径：dist/ 可放进离线包，由本地服务直接打开
  base: './',
  plugins: [glsl({ minify: true })],
  server: { port: 5173 },
  // three.js 本身约 600 kB，单包即可，离线运行不在意分包
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
