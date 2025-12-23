import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Mobil cihazlarda 'global' değişkeni bazen sorun çıkarır, window'a eşitliyoruz.
    'global': 'window',
    // API Key'i güvenli bir şekilde client-side'a gömüyoruz.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});