import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Droplets,
  Dumbbell,
  FileText,
  Moon,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth'
import { MosqueIllustration, StarPattern } from '../../components/shared/MosqueIllustration'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { BarChart } from '../../components/charts/Charts'
import { activitiesApi, dashboardApi, type DashboardProgress } from '../../lib/api/endpoints'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'
import '../../styles/user-dashboard.css'

interface ProgressCard {
  key: keyof DashboardProgress
  label: string
  description: string
  icon: LucideIcon
  colorClass: 'green' | 'purple' | 'orange' | 'blue'
}

const progressCards: ProgressCard[] = [
  {
    key: 'prayer',
    label: 'Prayer Progress',
    description: 'Daily prayers completed',
    icon: Moon,
    colorClass: 'green',
  },
  {
    key: 'quran',
    label: 'Quran Progress',
    description: 'Quran activities completed',
    icon: BookOpen,
    colorClass: 'purple',
  },
  {
    key: 'exercise',
    label: 'Exercise Progress',
    description: 'Exercise activities completed',
    icon: Dumbbell,
    colorClass: 'orange',
  },
  {
    key: 'other',
    label: 'Other Activities',
    description: 'Other daily activities completed',
    icon: Sparkles,
    colorClass: 'blue',
  },
]

interface PlanItem {
  id: string | number
  title: string
  subtitle: string
  icon: LucideIcon
  accent: 'green' | 'orange' | 'blue' | 'purple'
  current: number
  target: number
  unit: string
}

const defaultPlanItems: PlanItem[] = [
  {
    id: 'quran',
    title: 'Read Quran',
    subtitle: 'Surah Al-Mulk & daily juz',
    icon: BookOpen,
    accent: 'green',
    current: 15,
    target: 20,
    unit: 'mins',
  },
  {
    id: 'exercise',
    title: 'Exercise',
    subtitle: 'Morning jog & mobility',
    icon: Dumbbell,
    accent: 'orange',
    current: 30,
    target: 45,
    unit: 'mins',
  },
  {
    id: 'water',
    title: 'Drink Water',
    subtitle: 'Daily hydration goal',
    icon: Droplets,
    accent: 'blue',
    current: 6,
    target: 8,
    unit: 'glasses',
  },
]

const weeklyProgressData = [
  { label: 'Sun', value: 16, secondary: 3 },
  { label: 'Mon', value: 24, secondary: 2 },
  { label: 'Tue', value: 28, secondary: 1 },
  { label: 'Wed', value: 20, secondary: 4 },
  { label: 'Thu', value: 26, secondary: 2 },
  { label: 'Fri', value: 22, secondary: 3 },
  { label: 'Sat', value: 18, secondary: 4 },
]

export function UserDashboardPage() {
  const { user } = useAuth()
  const [range, setRange] = useState<'this_week' | 'last_week'>('this_week')

  const displayName = user?.name?.trim() ? user.name.split(' ')[0] : 'Hamza'

  const progressQuery = useQuery({
    queryKey: ['dashboard', 'progress'],
    queryFn: () => dashboardApi.progress(),
    staleTime: 60_000,
  })

  const { data: userActivities } = useQuery({
    queryKey: ['activities', 'today'],
    queryFn: () => activitiesApi.list(),
    staleTime: 60_000,
  })

  const progress = progressQuery.data?.progress

  // Derive today's plan items, combining core featured items with user's activities
  const planItems: PlanItem[] = [...defaultPlanItems]

  if (userActivities && userActivities.items.length > 0) {
    const extraActivity = userActivities.items.find(
      (a) => !defaultPlanItems.some((d) => d.title.toLowerCase().includes(a.title.toLowerCase()))
    )
    if (extraActivity) {
      planItems.push({
        id: extraActivity.id,
        title: extraActivity.title,
        subtitle: extraActivity.description || 'Scheduled activity',
        icon: CheckCircle2,
        accent: 'purple',
        current: extraActivity.status === 'completed' ? 1 : 0,
        target: 1,
        unit: extraActivity.status === 'completed' ? 'done' : 'pending',
      })
    }
  }

  return (
    <div className="user-dash-page">
      {/* 1. Welcome Banner (full width) */}
      <section className="user-hero" aria-label="Welcome banner">
        <div className="user-hero__pattern" aria-hidden="true" />
        <div className="user-hero__content">
          <span className="user-hero__date">
            <CalendarDays className="h-3 w-3" />
            {formatDate(new Date().toISOString(), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
          <h1 className="user-hero__title">Welcome Back, {displayName}!</h1>
          <p className="user-hero__text">
            Here&apos;s what&apos;s happening in your daily journey today. Consistency in small deeds brings steady growth and barakah.
          </p>
          <div className="user-hero__actions">
            <Link to="/app/schedule">
              <Button className="user-hero__button">
                View Schedule
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/app/reports/new">
              <Button variant="outline" className="user-hero__button-outline">
                <FileText className="h-4 w-4" />
                Daily Report
              </Button>
            </Link>
          </div>
        </div>

        <div className="user-hero__art" aria-hidden="true">
          <span className="user-hero__glow" />
          <StarPattern className="user-hero__star" />
          <StarPattern className="user-hero__star user-hero__star--small" />
          <MosqueIllustration className="user-hero__mosque" />
        </div>
      </section>

      {/* 2. Four personal-progress cards in a single horizontal row */}
      <section className="user-metrics-row" aria-label="Your progress">
        {progressCards.map((card) => {
          const Icon = card.icon
          const metric = progress?.[card.key]
          const loaded = metric !== undefined
          const percentage = loaded ? `${metric.percentage}%` : '--%'
          const sub = loaded
            ? `${metric.completed} of ${metric.total} activities completed`
            : card.description
          return (
            <article
              key={card.key}
              className={cn('user-metric-card', `user-metric-card--${card.colorClass}`)}
            >
              <div className="user-metric-card__top">
                <span className="user-metric-card__icon">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="user-metric-card__label">{card.label}</p>
              <div className="user-metric-card__figure">{percentage}</div>
              <p className="user-metric-card__sub">{sub}</p>
            </article>
          )
        })}
      </section>

      {/* 3. Lower Section: Progress Overview (left) + Today's Plan (right) */}
      <section className="user-lower-section">
        {/* Progress Overview (left) */}
        <Card className="user-panel">
          <div className="user-panel__head">
            <div className="user-panel__head-left">
              <span className="user-panel__icon">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="user-panel__title">Progress Overview</h2>
                <p className="user-panel__sub">Daily completed and planned activities</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as typeof range)}
                  className="h-8 appearance-none rounded-lg border border-[#DFE7D6] bg-[#F7F9F2] pl-3 pr-7 text-xs font-semibold text-[#25332D] outline-none focus:border-[#12683D]"
                  aria-label="Progress range"
                >
                  <option value="this_week">This Week</option>
                  <option value="last_week">Last Week</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="user-panel__body">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#12683D]" /> Completed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#D5E6D1]" /> Planned
                </span>
              </div>
              <strong className="text-[#12683D] font-bold">
                78% completion rate
              </strong>
            </div>

            <div className="pt-2">
              <BarChart
                data={weeklyProgressData}
                height={230}
                showYAxis
                valueLabel="Completed"
                secondaryLabel="Planned"
              />
            </div>
          </div>
        </Card>

        {/* Today's Plan (right) */}
        <Card className="user-panel">
          <div className="user-panel__head">
            <div className="user-panel__head-left">
              <span className="user-panel__icon">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <h2 className="user-panel__title">Today&apos;s Plan</h2>
                <p className="user-panel__sub">Scheduled tasks & progress</p>
              </div>
            </div>
            <Link to="/app/schedule" className="user-link">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="user-panel__body">
            <div className="user-plan-list">
              {planItems.map((item) => {
                const Icon = item.icon
                const percent = Math.min(100, Math.round((item.current / Math.max(1, item.target)) * 100))
                return (
                  <div key={item.id} className="user-plan-row">
                    <span
                      className={cn(
                        'user-plan-row__icon',
                        `user-plan-row__icon--${item.accent}`
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="user-plan-row__content">
                      <div className="user-plan-row__top">
                        <span className="user-plan-row__title">{item.title}</span>
                        <span className="user-plan-row__val">
                          {item.unit === 'done' || item.unit === 'due' || item.unit === 'pending'
                            ? item.unit.toUpperCase()
                            : `${item.current} / ${item.target} ${item.unit}`}
                        </span>
                      </div>
                      <div className="user-plan-row__bar">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
