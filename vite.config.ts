import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Sadece API Key'i replace ediyoruz. 
    // Diğer global ve process tanımları index.html içindeki polyfill ile hallediliyor.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});