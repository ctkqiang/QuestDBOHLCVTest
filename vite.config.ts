import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const qdbUrl = env.VITE_QDB_HTTP_URL || 'http://127.0.0.1:9000'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/qdb': {
          target: qdbUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/qdb/, '')
        }
      }
    }
  }
})
