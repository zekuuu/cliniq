// One-off helper: sign in as the nurse and print the app's own API lists, to pick records.
//   node probe.mjs <api path> [<api path> ...]
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'))
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()
await page.goto(`${config.baseUrl}/login`)
await page.locator('input[autocomplete="username"]').fill(process.env.PROBE_USER ?? config.users.staff)
await page.locator('input[autocomplete="current-password"]').fill(process.env.CLINIQ_CAPTURE_PASSWORD)
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
console.log('signed in, now at', page.url())
for (const path of process.argv.slice(2)) {
  let body = ''
  for (let tries = 0; tries < 8; tries++) {
    body = await page.evaluate(async (url) => {
      const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } })
      return `${r.status} ${await r.text()}`
    }, `${config.apiUrl}${path}`)
    if (!body.startsWith('429')) break
    await page.waitForTimeout(15000) // 120 requests a minute per user
  }
  console.log(`--- ${path}\n${body.slice(0, Number(process.env.PROBE_MAX ?? 3000))}`)
}
await browser.close()
