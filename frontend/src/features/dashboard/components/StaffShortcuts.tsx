import { Link } from 'react-router'
import { buttonClassName, Icon } from '../../../components'
import { cn } from '../../../lib/cn'
import { paths } from '../../../routes/paths'

export function NewVisitLink({ className }: { className?: string }) {
  return (
    <Link to={paths.visitNew} className={cn(buttonClassName({ variant: 'primary' }), className)}>
      <Icon name="stethoscope" />
      New Visit
    </Link>
  )
}
