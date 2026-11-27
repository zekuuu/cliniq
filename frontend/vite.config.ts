/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import packageJson from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Keep dependencies that are shared by lazy screens independent of application chunks.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom)[\\/]/, priority: 3 },
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/, priority: 2 },
            {
              name: 'charts',
              test: /node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              priority: 2,
            },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]react-query[\\/]/, priority: 2 },
          ],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    globals: true,
    // Tests run on the mock whatever a developer's .env says (ADR-080); API-mode tests stub these.
    env: Object.fromEntries(
      [
        '',
        '_AUTH',
        '_STUDENTS',
        '_STAFF_PATIENTS',
        '_SCHOOL_YEARS',
        '_VISITS',
        '_INCIDENTS',
        '_INVENTORY',
        '_DASHBOARD',
        '_REPORTS',
        '_USERS',
        '_BACKUP',
        '_AUDIT',
        '_SETTINGS',
        '_ISSUE_REPORTS',
        '_REFERENCE',
      ].map((suffix) => [`VITE_API_MODE${suffix}`, '']),
    ),
  },
})
