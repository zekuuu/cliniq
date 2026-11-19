import { Toaster as SonnerToaster } from 'sonner'
import { Icon } from '../icons/Icon'

/**
 * The one toast stack (ADR-083), mounted once in `App`. Toasts are sent with `notify` (`lib/notify.ts`),
 * never with `sonner` directly. Bottom right, above the "Scroll to top" button (16px from the edge,
 * 40px tall), so a toast never hides it. Sonner's own z-index sits above every Modal (z-40).
 * Every toast is the same white card; the shrinking line along the bottom (`index.css`, "Toasts")
 * and the icon are coloured by kind. The icons are the app's own outline set, in each meaning's
 * text shade (ADR-062), so they match every other icon in CLINIQ (Zean, November 19, 2026).
 */
const ICONS = {
  success: <Icon name="checkCircle" size={18} className="text-success" />,
  error: <Icon name="xCircle" size={18} className="text-error-text" />,
  warning: <Icon name="alertTriangle" size={18} className="text-warning-text" />,
  info: <Icon name="info" size={18} className="text-info-text" />,
}

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="light"
      closeButton
      visibleToasts={3}
      expand={false}
      offset={{ bottom: 64, right: 16 }}
      mobileOffset={{ bottom: 64, left: 16, right: 16 }}
      containerAriaLabel="Notifications"
      icons={ICONS}
      toastOptions={{ closeButtonAriaLabel: 'Close notification' }}
    />
  )
}
