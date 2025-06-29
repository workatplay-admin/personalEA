import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Production configuration
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    // Production optimizations
    build: {
      outDir: 'dist',
      sourcemap: false, // Disable source maps in production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and related libraries
            vendor: ['react', 'react-dom', 'react-router-dom'],
            // UI utilities chunk
            ui: ['lucide-react', 'clsx'],
            // API and services chunk
            api: ['axios'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    
    // Production server configuration
    server: {
      port: parseInt(env.VITE_APP_PORT || '5173'),
      host: true,
      strictPort: true,
      cors: {
        origin: env.VITE_ALLOWED_ORIGINS?.split(',') || ['https://personalea.com'],
        credentials: true,
      },
    },
    
    // Preview server for production builds
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || '5173'),
      host: true,
      strictPort: true,
      cors: {
        origin: env.VITE_ALLOWED_ORIGINS?.split(',') || ['https://personalea.com'],
        credentials: true,
      },
    },
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __PRODUCTION__: JSON.stringify(true),
    },
    
    // Resolve aliases for cleaner imports
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@services': resolve(__dirname, './src/services'),
        '@types': resolve(__dirname, './src/types'),
        '@utils': resolve(__dirname, './src/utils'),
      },
    },
  }
})