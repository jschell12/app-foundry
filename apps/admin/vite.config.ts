import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Path the built app is served under. The deploy stack serves the
  // dashboard at /app/ and admin at /admin/ on the same host as the API.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3002,
  },
});
