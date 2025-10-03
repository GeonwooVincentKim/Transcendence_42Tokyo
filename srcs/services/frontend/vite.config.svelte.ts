import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    svelte({
      compilerOptions: {
        // Disable dev mode for faster builds
        dev: mode === 'development'
      }
    }),
    // Bundle analyzer (only in analyze mode)
    mode === 'analyze' && visualizer({
      filename: 'dist-svelte/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),
  
  root: './',
  publicDir: 'public',
  
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  
  build: {
    outDir: 'dist-svelte',
    // Optimize sourcemap based on mode
    sourcemap: mode === 'development' ? 'inline' : false,
    
    // Faster builds with these optimizations
    minify: mode === 'fast' ? false : 'esbuild',
    target: 'es2020',
    
    rollupOptions: {
      input: 'index-svelte.html',
      output: {
        manualChunks: {
          vendor: ['svelte', 'socket.io-client']
        }
      }
    }
  },
  
  preview: {
    port: 3001,
    host: true
  },
  
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['svelte', 'socket.io-client'],
    force: mode === 'fast' // Force re-optimization in fast mode
  },
  
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src-svelte/shared'),
      '@shared/*': path.resolve(__dirname, './src-svelte/shared/*'),
    }
  },
  
  // TypeScript optimization
  esbuild: {
    target: 'es2020'
  }
}))

