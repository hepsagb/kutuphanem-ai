import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Bu ayar, Vercel'deki Environment Variable'ı alıp
    // derleme (build) esnasında kodun içine string olarak yazar.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});