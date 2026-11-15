import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserDashboardPage } from '../pages/user/UserDashboardPage'
import * as authHook from '../features/auth/useAuth'

vi.mock('../features/auth/useAuth')
vi.mock('../lib/api/endpoints', () => ({
  activitiesApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        { id: 1, title: 'Read Quran', status: 'completed' },
        { id: 2, title: 'Exercise', status: 'in_progress' },
      ],
      total: 2,
      nextPage: null,
    }),
  },
  dashboardApi: {
    progress: vi.fn().mockResolvedValue({
      progress: {
        prayer: { completed: 4, total: 5, percentage: 80 },
        quran: { completed: 2, total: 4, percentage: 50 },
        exercise: { completed: 1, total: 3, percentage: 33 },
        other: { completed: 0, total: 0, percentage: 0 },
      },
    }),
  },
}))

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  vi.spyOn(authHook, 'useAuth').mockReturnValue({
    user: {
      id: 10,
      name: 'Hamza Khan',
      email: 'hamza@daeimini.com',
      email_verified_at: null,
      created_at: '',
      updated_at: '',
    },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendVerificationEmail: vi.fn(),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app']}>
        <UserDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('UserDashboardPage', () => {
  it('renders personalized welcome greeting with actions', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: /welcome back, hamza!/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view schedule/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /daily report/i })).toBeInTheDocument()
  })

  it('renders the four personal progress cards wired to the progress API', async () => {
    renderComponent()

    expect(screen.getByText(/prayer progress/i)).toBeInTheDocument()
    expect(screen.getByText(/quran progress/i)).toBeInTheDocument()
    expect(screen.getByText(/exercise progress/i)).toBeInTheDocument()
    expect(screen.getByText(/other activities/i)).toBeInTheDocument()

    // Placeholder percentages are shown until the API responds.
    expect(screen.getAllByText('--%').length).toBeGreaterThan(0)

    expect(await screen.findByText('80%')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders Progress Overview section with bar chart and completion rate', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: /progress overview/i })).toBeInTheDocument()
    expect(screen.getByText(/78% completion rate/i)).toBeInTheDocument()
  })

  it('renders Today\'s Plan with activities and View All link', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: /today's plan/i })).toBeInTheDocument()
    expect(screen.getByText(/read quran/i)).toBeInTheDocument()
    expect(screen.getByText('Exercise')).toBeInTheDocument()
    expect(screen.getByText(/drink water/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/app/schedule')
  })
})
