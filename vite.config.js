import { defineConfig } from 'vite';
import { resolve } from 'path';

// 多页面入口配置
// 书架目录 + 统一故事阅读页
const pages = {
  main: resolve(__dirname, 'index.html'),
  story: resolve(__dirname, 'story.html'),
};

// 支持通过环境变量配置 base 路径
// 使用相对路径，适配任何部署环境
const base = './';

export default defineConfig({
  base: base,
  build: {
    rollupOptions: {
      input: pages,
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(mp3|wav|ogg|m4a)$/i.test(assetInfo.name)) {
            return 'assets/audio/[name][extname]';
          }
          if (/\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
