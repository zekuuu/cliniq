/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import packageJson from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
