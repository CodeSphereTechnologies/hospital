import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserDetailsPage } from '../pages/admin/UserDetailsPage'
import { ToastProvider } from '../components/ui/toast/ToastProvider'

vi.mock('../features/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, name: 'Admin User', role: 'admin' },
  })),
}))

vi.mock('../lib/api/admin', () => ({
  adminApi: {
    users: {
      get: vi.fn().mockResolvedValue({
        user: {
          id: 5,
          name: 'Hamza Khan',
          email: 'hamza@example.com',
          role: 'user',
          status: 'active',
          is_active: true,
          groups: [{ id: 1, name: 'The Daei Team' }],
          group: 'The Daei Team',
          joined_at: '2026-11-01',
          last_active: '2026-11-14T10:00:00Z',
          activities: 12,
          reports: 5,
          progress: 85,
          phone: '+92 300 1234567',
          location: 'Lahore, Pakistan',
          bio: 'Active member striving for daily consistency.',
        },
        reports: [
          {
            id: 1,
            report_date: '2026-11-13',
            summary: 'Completed morning routine and daily goals.',
            calculated_score: 90,
            status: 'reviewed',
          },
        ],
        activities: [
          {
            id: 1,
            title: 'Fajr in congregation',
            activity_type: 'prayer',
            scheduled_date: '2026-11-14',
            start_time: '05:30',
            status: 'completed',
          },
        ],
      }),
    },
    groups: {
      list: vi.fn().mockResolvedValue({ items: [{ id: 1, name: 'The Daei Team' }] }),
    },
  },
}))

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/admin/users/5']}>
          <Routes>
            <Route path="/admin/users/:id" element={<UserDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('UserDetailsPage', () => {
  it('renders the hero card with member name, badges and action controls', async () => {
    renderComponent()

    expect(await screen.findByRole('heading', { level: 1, name: 'Hamza Khan' })).toBeInTheDocument()
    expect(screen.getAllByText('hamza@example.com').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /suspend user/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete user/i })).toBeInTheDocument()
  })

  it('renders stats and about information', async () => {
    renderComponent()

    expect(await screen.findByText('Activities logged')).toBeInTheDocument()
    expect(screen.getByText('Reports submitted')).toBeInTheDocument()
    expect(screen.getByText('Overall progress')).toBeInTheDocument()
    expect(screen.getByText('Active member striving for daily consistency.')).toBeInTheDocument()
    expect(screen.getByText('+92 300 1234567')).toBeInTheDocument()
    expect(screen.getByText('Lahore, Pakistan')).toBeInTheDocument()
  })
})
