import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Sadece API Key'i güvenli bir şekilde string olarak gömüyoruz.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});