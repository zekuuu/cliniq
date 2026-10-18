/** Shared application footer. It is screen chrome, never part of A4 documents. */
export function AppFooter() {
  return (
    <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border/70 px-4 py-3 text-xs text-text-secondary print:hidden">
      <img src="/Healware_Logo.png" alt="HealWare logo" className="size-6 object-contain" />
      <img src="/MCA_Logo.png" alt="Mendez Christian Academy logo" className="size-6 object-contain" />
      <span>© {new Date().getFullYear()} HealWare and Mendez Christian Academy. All rights reserved.</span>
    </footer>
  )
}
