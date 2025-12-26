import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    // Ενεργοποίηση HTTPS για τοπική ανάπτυξη (απαραίτητο για PWA/Service Workers)
    // Fix: Use an empty object to satisfy the TypeScript ServerOptions type requirement while using basicSsl
    https: {},
    host: true,
    port: 5173,
    // Αυτόματο άνοιγμα του browser κατά την εκκίνηση
    open: true
  }
});