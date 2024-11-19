import * as path from 'path';

import solid from 'vite-plugin-solid'
import glsl from 'vite-plugin-glsl'

import { version } from './package.json'
import { defineConfig } from 'vite'

export default ({ mode }: { mode: string }) => defineConfig({
  define: {
    IS_DEBUG: mode !== 'production',
    APP_MODE: JSON.stringify(mode),
    APP_VERSION: JSON.stringify(version)
  },

  resolve: {
    conditions: ['development', 'browser'],

    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
    }
  },

  plugins: [
    solid(),
    glsl({ compress: mode === 'production', root: '/src/shaders/' }),
  ],

  server: {
    host: 'localhost',
    port: 8000,
    open: true
  },

  css: {
    devSourcemap: true,
  },

  build: {
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    sourcemap: true
  },

  base: './',
});
