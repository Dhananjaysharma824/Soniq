import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function musicApiDevPlugin(): Plugin {
  return {
    name: 'music-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/music/search') || req.url.startsWith('/api/music/popular'))) {
          try {
            const parsed = new URL(req.url, 'http://localhost:5173')
            const q = parsed.searchParams.get('q') || 'Bollywood Top Hits'
            const limit = Number(parsed.searchParams.get('limit')) || 40
            const offset = Number(parsed.searchParams.get('offset')) || 0
            const { searchFullSongs } = await import('./server/saavnService.js')
            const songs = await searchFullSongs(q, limit, offset)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(
              JSON.stringify({
                headers: { status: 'success', code: 0, results_count: songs.length },
                results: songs,
              }),
            )
            return
          } catch (e) {
            console.error('Dev music api middleware error:', e)
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), musicApiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr'],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
