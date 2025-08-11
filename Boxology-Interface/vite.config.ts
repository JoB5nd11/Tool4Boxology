import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Tool4Boxology/' // IMPORTANT for GitHub Pages under repo path
})
