import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('gsap')) {
              return 'vendor-animation';
            }
          } else if (id.includes('src/pages/') || id.includes('src\\pages\\')) {
            if (id.includes('ExamSeatingPage') || id.includes('ClassroomSeatingPage') || id.includes('ExamManagementPage')) {
              return 'feature-seating';
            }
            if (id.includes('ReportsPage') || id.includes('MathAnalysisPage') || id.includes('AuditLogsPage')) {
              return 'feature-analytics';
            }
            if (id.includes('RoomsPage') || id.includes('TimetablePage') || id.includes('UniversityPage') || id.includes('StudentPage') || id.includes('FacultyPage') || id.includes('UserManagementPage')) {
              return 'feature-academic';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
