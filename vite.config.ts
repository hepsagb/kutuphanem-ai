import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel'deki Environment Variable'ı koda gömer
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Bazı kütüphanelerin "process is not defined" hatası vermesini önler
    'process.env': {} 
  }
});