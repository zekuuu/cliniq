import { Link } from 'react-router'
import { buttonClassName, Icon, ShortcutHint } from '../../../components'
import { SHORTCUT_KEYS } from '../../../lib/shortcuts'
import { cn } from '../../../lib/cn'
import { paths } from '../../../routes/paths'

export function NewVisitLink({ className }: { className?: string }) {
  return (
    <Link to={paths.visitNew} aria-keyshortcuts={SHORTCUT_KEYS.newVisit} className={cn(buttonClassName({ variant: 'primary' }), className)}>
      <Icon name="stethoscope" />
      New Visit
      <ShortcutHint keys={SHORTCUT_KEYS.newVisit} />
    </Link>
  )
}
