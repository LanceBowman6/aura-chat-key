import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Use localhost to satisfy "potentially trustworthy origin" rules in browsers.
    host: 'localhost',
    port: 8080,
    strictPort: true,
    // Base Account SDK requires COOP not set to 'same-origin'.
    // Only enable cross-origin isolation if explicitly requested via env.
    headers: (process.env.VITE_ENABLE_CROSS_ORIGIN_ISOLATION === '1')
      ? {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        }
      : undefined,
    fs: {
      // Allow importing deployment artifacts from the monorepo root
      allow: [".."],
    },
    // Let Vite pick sane defaults for HMR to avoid mismatch
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Force Lit to use production mode when not in development
    'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
  },
}));
