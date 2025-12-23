import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Mobilde hatayı önlemek için 'global' değişkenini window'a eşitliyoruz
    global: 'window',
    // Vercel Environment Variable'ı güvenli bir şekilde string olarak koda gömüyoruz
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    // Process nesnesini boş bir obje olarak tanımlıyoruz
    'process.env': {} 
  }
});