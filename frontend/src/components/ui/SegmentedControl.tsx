import { useRef, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'

export interface SegmentOption<V extends string> {
  value: V
  label: string
  icon?: IconName
  /** A colour of its own, e.g. a disposition's status tone: `className` while not chosen, `selectedClassName` when chosen. */
  className?: string
  selectedClassName?: string
}

export interface SegmentedControlProps<V extends string> {
  /** Accessible name, e.g. "Calendar view". */
  label: string
  options: ReadonlyArray<SegmentOption<V>>
  value: V
  onChange: (value: V) => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Segmented toggle, built as an ARIA radiogroup: Tab lands on the selected option, and Arrow keys,
 * Home, and End move the selection. The selected state uses fill, border, and weight together,
 * never color alone.
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  size = 'sm',
  className,
}: SegmentedControlProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function select(index: number) {
    const next = options[(index + options.length) % options.length]
    onChange(next.value)
    refs.current[(index + options.length) % options.length]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keyMap: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: options.length - 1,
    }
    if (event.key in keyMap) {
      event.preventDefault()
      select(keyMap[event.key])
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex gap-0.5 rounded-md bg-surface p-1', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-2.5 transition-colors duration-150 motion-reduce:transition-none',
              size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
              selected && option.selectedClassName
                ? cn('font-semibold shadow-card ring-2 ring-offset-1', option.selectedClassName)
                : option.className && !selected
                ? cn('font-medium text-text-primary hover:brightness-95', option.className)
                : selected
                ? // Raised white chip. The brand-green ring (3.43:1 on surface) is the non-color-alone
                  // state indicator, backed by weight and the dark-green label.
                  'bg-background font-semibold text-brand-green-dark shadow-card ring-1 ring-brand-green hover:bg-surface'
                : 'font-medium text-text-secondary hover:bg-background hover:text-text-primary',
            )}
          >
            {option.icon && <Icon name={option.icon} size={14} />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
