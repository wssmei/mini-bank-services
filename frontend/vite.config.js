import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(), // transforme le JSX et active le rechargement à chaud
    tailwindcss(), // génère les classes Tailwind utilisées dans les composants
  ],
  server: {
    // Port fixe : le backend n'accepte que http://localhost:5173 et http://127.0.0.1:5173 (CORS).
    port: 5173,
    strictPort: true,
  },
});
