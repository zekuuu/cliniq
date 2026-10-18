import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserAvatar } from './UserAvatar'

describe('UserAvatar', () => {
  it('uses initials when an account has no picture', () => {
    render(<UserAvatar name="Maria Santos" />)

    expect(screen.getByText('MS')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders a decorative stored picture when present', () => {
    const { container } = render(<UserAvatar name="Maria Santos" picture="data:image/webp;base64,picture" />)

    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})
