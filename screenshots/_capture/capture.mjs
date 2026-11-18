// Captures the Project Plan screenshots of CLINIQ (see ../INDEX.md).
//
//   set CLINIQ_CAPTURE_PASSWORD_STAFF=<the staff account's password>
//   set CLINIQ_CAPTURE_PASSWORD_ADMIN=<the admin account's password>
//   node capture.mjs            all screens
//   node capture.mjs 07 13      only those numbers
//
// Settings, the picked record ids and the frozen clock are in config.json. Passwords are read
// from the environment only, never from a file (CLINIQ_CAPTURE_PASSWORD serves both if set).
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..')
const config = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8').replace(/^﻿/, ''))
const passwords = {
  staff: process.env.CLINIQ_CAPTURE_PASSWORD_STAFF ?? process.env.CLINIQ_CAPTURE_PASSWORD,
  admin: process.env.CLINIQ_CAPTURE_PASSWORD_ADMIN ?? process.env.CLINIQ_CAPTURE_PASSWORD,
}
const only = process.argv.slice(2)
const ids = config.ids
const W = 1536
const H = 960

// Injected by this script only (listed in INDEX.md): hide the development data-mode badge
// (DevDataMode.tsx) and stop animations, transitions and the text caret.
const CAPTURE_CSS = `
details[class*="z-[100]"] { display: none !important; }
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
`

const SCREENS = [
  ['01', 'both', 'login', '/login', hideDemoAccounts],
  ['02', 'staff', 'dashboard-overview', '/'],
  ['03', 'staff', 'dashboard-trends', '/?view=trends'],
  ['04', 'staff', 'activity-calendar', '/calendar', calendarMonth],
  ['05', 'staff', 'student-list', '/students'],
  ['06', 'staff', 'add-student', '/students/new'],
  ['07', 'staff', 'student-profile', () => `/students/${ids.student}`],
  ['08', 'staff', 'incomplete-student-records', '/students/incomplete'],
  ['09', 'staff', 'yearly-list-import', '/students/import'],
  ['10', 'staff', 'staff-list', '/staff'],
  ['11', 'staff', 'staff-profile', () => `/staff/${ids.staffMember}`],
  ['12', 'staff', 'visit-log', '/visits'],
  ['13', 'staff', 'new-visit', '/visits/new', newVisit],
  ['14', 'staff', 'visit-detail', () => `/visits/${ids.visit}`],
  ['15', 'staff', 'excuse-letter', () => `/visits/${ids.visit}/excuse-letter`],
  ['16', 'staff', 'pe-sports-referral', '/visits/pe-referral'],
  ['17', 'staff', 'follow-ups', '/follow-ups'],
  ['18', 'staff', 'incident-log', '/incidents'],
  ['19', 'staff', 'new-incident-stage-1', '/incidents/new'],
  ['20', 'staff', 'complete-incident-stage-2', () => `/incidents/${ids.stage1Incident}/complete`],
  ['21', 'staff', 'incident-report', () => `/incidents/${ids.completedIncident}/report`],
  ['22', 'staff', 'inventory-list', '/inventory'],
  ['23', 'staff', 'dispense-log-usage', '/inventory/dispense'],
  ['24', 'staff', 'monthly-report', () => config.reportsQuery ? `/reports?${config.reportsQuery}` : '/reports'],
  ['25', 'staff', 'sports-reports', '/reports/sports'],
  ['26', 'staff', 'backup-status', '/backup'],
  ['27', 'staff', 'audit-log', '/audit-log'],
  ['28', 'staff', 'settings', '/settings'],
  ['29', 'admin', 'dashboard', '/'],
  ['30', 'admin', 'student-list-read-only', '/students'],
  ['31', 'admin', 'reports', '/reports'],
  ['32', 'admin', 'user-accounts', '/users'],
  ['33', 'admin', 'add-user', '/users/new'],
  ['34', 'admin', 'archive', '/archive'],
]

async function frames(page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

/** Network idle, fonts, no skeleton/spinner/loading text, two frames. Throws after 15 s. */
async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  const deadline = Date.now() + 15000
  for (;;) {
    const busy = await page.evaluate(() => {
      if (document.querySelector('[data-skeleton], [aria-busy="true"], .animate-spin')) return 'skeleton or spinner'
      if (/Loading…|Loading\.\.\.|Signing in…/.test(document.body.innerText)) return 'loading text'
      return null
    })
    if (!busy) break
    if (Date.now() > deadline) throw new Error(`still loading after 15 s (${busy})`)
    await page.waitForTimeout(250)
  }
  await page.evaluate(() => document.fonts.ready)
  await frames(page)
}

/** Inner elements that still scroll at the current size (reported, not expanded). */
async function innerScrollers(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => {
        const s = getComputedStyle(el)
        return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1
      })
      .map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('aria-label') ?? el.className.toString().slice(0, 40)}] ${el.clientHeight}/${el.scrollHeight}`),
  )
}

async function shoot(page, file) {
  await page.setViewportSize({ width: W, height: H })
  await settle(page)
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null))
  await page.mouse.move(0, 0)
  let height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
  let mode = 'single'
  if (height > H) {
    mode = 'scrolling'
    // The page scrolls the document; grow the viewport to the content until it stops changing
    // (the sticky h-screen sidebar grows with it).
    for (let i = 0; i < 5; i++) {
      await page.setViewportSize({ width: W, height })
      await settle(page)
      const next = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
      if (next === height) break
      height = next
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await frames(page)
  }
  const scrollers = await innerScrollers(page)
  await page.screenshot({ path: join(out, file), type: 'png', animations: 'disabled', caret: 'hide' })
  await page.setViewportSize({ width: W, height: H })
  return { mode, cssHeight: mode === 'single' ? H : height, scrollers }
}

// ---- per-screen preparation ----------------------------------------------------------

// Zean, November 17, 2026: the Login shot leaves out the development-only "Demo Accounts" button
// (DemoAccounts.tsx). Hidden in this page only, by the script; the app is not changed.
async function hideDemoAccounts(page) {
  await page.getByRole('button', { name: 'Demo Accounts' }).evaluate((el) => el.style.setProperty('display', 'none', 'important'))
}

async function calendarMonth(page) {
  if (!config.calendarMonth) return
  // Steps back with the calendar's own "Previous month" control until the chosen month shows.
  for (let i = 0; i < 24; i++) {
    if ((await page.getByText(config.calendarMonth, { exact: false }).count()) > 0) return
    await page.getByRole('button', { name: /previous month/i }).first().click()
    await settle(page)
  }
  throw new Error(`calendar month ${config.calendarMonth} not reached`)
}

async function newVisit(page) {
  const picker = page.getByRole('combobox', { name: /student or staff|patient/i }).first()
  await picker.fill(config.newVisit.patientQuery)
  await page.getByRole('option').first().waitFor({ timeout: 15000 })
  await page.getByRole('option').first().click()
  await settle(page)
  await page.locator('button[aria-haspopup="listbox"]').filter({ hasText: /select symptom/i }).first().click()
  // The list re-renders while suggestions load, so a pointer click never finds it "stable".
  await page.getByRole('option', { name: config.newVisit.symptom, exact: true }).dispatchEvent('click')
  await settle(page)
}

// ---- run ----------------------------------------------------------------------------

async function context(browser) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-PH',
    timezoneId: 'Asia/Manila',
  })
  await ctx.addInitScript((css) => {
    const add = () => {
      const style = document.createElement('style')
      style.dataset.capture = 'true'
      style.textContent = css
      document.head.appendChild(style)
    }
    if (document.head) add()
    else document.addEventListener('DOMContentLoaded', add)
  }, CAPTURE_CSS)
  // The generated school ends on its build day; the browser's clock starts there so "Today" views
  // show that day (Zean, November 18, 2026). Time runs on from this moment.
  if (config.clock) await ctx.clock.setSystemTime(new Date(config.clock))
  return ctx
}

async function signIn(ctx, username, who) {
  if (!passwords[who]) throw new Error(`Set CLINIQ_CAPTURE_PASSWORD_${who.toUpperCase()} first.`)
  const page = await ctx.newPage()
  await page.goto(`${config.baseUrl}/login`)
  await page.locator('input[autocomplete="username"]').fill(username)
  await page.locator('input[autocomplete="current-password"]').fill(passwords[who])
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 })
  await page.close()
}

const browser = await chromium.launch()
const results = existsSync(join(here, 'results.json')) ? JSON.parse(readFileSync(join(here, 'results.json'), 'utf8')) : {}
const contexts = {}
mkdirSync(out, { recursive: true })
try {
  for (const [nn, role, name, route, prepare] of SCREENS) {
    if (only.length && !only.includes(nn)) continue
    const file = `${nn}_${role}_${name}.png`
    const loggedIn = nn !== '01'
    const who = role === 'admin' ? 'admin' : 'staff'
    const key = loggedIn ? who : 'anonymous'
    if (!contexts[key]) {
      contexts[key] = await context(browser)
      if (loggedIn) await signIn(contexts[key], config.users[who], who)
    }
    const path = typeof route === 'function' ? route() : route
    // The API allows 120 requests a minute per user: pace the screens, and retake a screen whose
    // requests were refused (429) or failed (5xx) after the window passes.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const page = await contexts[key].newPage()
      const bad = []
      page.on('response', (r) => {
        // A signed-out page asks /auth/me and gets 401: expected on the Login screen.
        if (!loggedIn && r.status() === 401 && r.url().includes('/auth/me')) return
        if (r.url().startsWith(config.apiUrl) && r.status() >= 400) bad.push(`${r.status()} ${new URL(r.url()).pathname}${new URL(r.url()).search}`)
      })
      try {
        await page.goto(`${config.baseUrl}${path}`)
        await settle(page)
        if (prepare) await prepare(page)
        if (bad.length) throw new Error(`API answered ${bad.join(', ')}`)
        const r = await shoot(page, file)
        if (bad.length) throw new Error(`API answered ${bad.join(', ')}`)
        results[nn] = { file, role, route: path, ...r, takenAt: new Date().toISOString() }
        console.log(`${file}  ${r.mode}  ${W}x${r.cssHeight} css${r.scrollers.length ? `  inner scroll: ${r.scrollers.join('; ')}` : ''}`)
        break
      } catch (error) {
        console.log(`${attempt < 3 ? 'retrying' : 'FAILED'} ${file}: ${error.message}`)
        results[nn] = { file, role, route: path, failed: error.message }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 30000))
      } finally {
        await page.close()
      }
    }
    await new Promise((r) => setTimeout(r, config.pauseMs ?? 4000))
  }
} finally {
  writeFileSync(join(here, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
}
