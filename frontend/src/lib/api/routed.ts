import { apiMode, type ApiModule } from './mode'

/** One function, two sources: the module's mode picks the mock or the HTTP version at each call. */
export function routed<F extends (...args: never[]) => unknown>(
  module: ApiModule,
  mockFn: F,
  httpFn: (...args: Parameters<F>) => ReturnType<F>,
): F {
  return ((...args: Parameters<F>) =>
    apiMode(module) === 'api' ? httpFn(...args) : mockFn(...args)) as F
}
