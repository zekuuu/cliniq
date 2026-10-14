import { Link } from 'react-router'
import { BackButton, buttonClassName, Card, EmptyState } from '../components'

/**
 * Shown for any URL that isn't a screen. Back returns to where the viewer came from (their home
 * screen when the address was opened directly); the button always goes home.
 */
export function NotFoundPage({ home }: { home: string }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <BackButton fallback={home} />
      <h1 className="sr-only">Page Not Found</h1>
      <Card>
        <EmptyState
          icon="alertTriangle"
          title="This page doesn't exist."
          description="The address may be mistyped, or the screen may not be built yet."
        />
        <div className="flex justify-center pb-6">
          <Link to={home} className={buttonClassName({ variant: 'primary' })}>
            Go to Home Screen
          </Link>
        </div>
      </Card>
    </div>
  )
}
