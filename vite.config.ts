import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    sourcemap: true, // ソースマップを有効にする
  },
  resolve: {
    alias: {
      // パスエイリアスの設定
    },
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },
});
