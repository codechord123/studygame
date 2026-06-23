import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Phaser 게임 청크는 게임 진입 시에만 지연 로드되므로 크기 경고를 완화
  build: { chunkSizeWarningLimit: 1600 },
})
