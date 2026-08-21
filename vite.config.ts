import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Đường dẫn tương đối giúp game chạy đúng với mọi tên repository GitHub Pages.
  base: "./",
  plugins: [react()],
});
