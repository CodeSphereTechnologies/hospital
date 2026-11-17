import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Search,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeProps } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { formatDateTime, relativeTime } from '../../lib/format'
import type { AdminActivityLog } from '../../lib/api/admin'

const PAGE_SIZE = 15

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function categoryVariant(category: string): BadgeProps['variant'] {
  switch (category) {
    case 'auth':
      return 'info'
    case 'users':
      return 'default'
    case 'groups':
      return 'secondary'
    case 'activities':
      return 'warning'
    case 'reports':
      return 'success'
    default:
      return 'outline'
  }
}

export function ActivityLogsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [action, setAction] = useState('all')
  const [userId, setUserId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const logsQuery = useQuery({
    queryKey: ['admin', 'activity-logs', debouncedSearch, action, userId, from, to, page],
    queryFn: () =>
      adminApi.activityLogs({
        q: debouncedSearch || undefined,
        action: action === 'all' ? undefined : action,
        user_id: userId === 'all' ? undefined : userId,
        from: from || undefined,
        to: to || undefined,
        page,
        per_page: PAGE_SIZE,
      }),
    staleTime: 15_000,
  })

  const logs: AdminActivityLog[] = logsQuery.data?.items ?? []
  const stats = logsQuery.data?.stats ?? { total: 0, today: 0, week: 0, members: 0 }
  const filters = logsQuery.data?.filters ?? { actions: [], users: [] }
  const meta = logsQuery.data?.meta
  const currentPage = meta?.current_page ?? page
  const totalPages = Math.max(1, meta?.last_page ?? 1)

  const clearFilters = () => {
    setSearch('')
    setAction('all')
    setUserId('all')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const hasFilters =
    search !== '' || action !== 'all' || userId !== 'all' || from !== '' || to !== ''

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monitor"
        title="Activity logs"
        description="A chronological audit trail of the sign-ins, submissions and administrative actions across the workspace."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total events" value={stats.total} icon={History} hint="all recorded actions" />
        <StatCard label="Today" value={stats.today} icon={Clock3} accent="sky" hint="last 24 hours" />
        <StatCard label="Last 7 days" value={stats.week} icon={CalendarDays} accent="emerald" hint="this week" />
        <StatCard label="Active members" value={stats.members} icon={Users} accent="amber" hint="with recorded actions" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-6 sm:p-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search actions, descriptions or members…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search activity logs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                containerClassName="w-44"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by action"
                options={[
                  { value: 'all', label: 'All actions' },
                  ...filters.actions.map((item) => ({ value: item.value, label: item.label })),
                ]}
              />
              <Select
                containerClassName="w-44"
                value={userId}
                onChange={(event) => {
                  setUserId(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by member"
                options={[
                  { value: 'all', label: 'All members' },
                  ...filters.users.map((item) => ({ value: String(item.value), label: item.label })),
                ]}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              aria-label="Filter from date"
            />
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              aria-label="Filter to date"
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {logsQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading activity…</div>
          ) : logsQuery.isError ? (
            <EmptyState
              icon={Activity}
              title="Could not load activity"
              description={errorMessage(logsQuery.error, 'The activity log is unavailable right now.')}
              action={
                <Button variant="outline" size="sm" onClick={() => void logsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No activity found"
              description={
                hasFilters
                  ? 'Try a different action, member or date range.'
                  : 'Actions will appear here as members and administrators use the workspace.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>IP address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-700">{relativeTime(log.created_at)}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(log.created_at)}</p>
                    </TableCell>
                    <TableCell>
                      {log.actor ? (
                        <div className="flex items-center gap-2.5">
                          <Avatar name={log.actor.name} src={log.actor.avatar_url ?? undefined} size="sm" />
                          <div className="min-w-0">
                            <Link
                              to={`/admin/users/${log.actor.id}`}
                              className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700 hover:underline"
                            >
                              {log.actor.name}
                            </Link>
                            <p className="truncate text-xs text-slate-500">
                              {log.actor.role === 'admin' ? 'Administrator' : log.actor.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={categoryVariant(log.category)}>{log.action_label}</Badge>
                    </TableCell>
                    <TableCell className="min-w-[16rem] text-sm text-slate-600">{log.description}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {log.subject_type ? `${log.subject_type} #${log.subject_id ?? '—'}` : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-400">
                      {log.ip_address ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
            <p>
              Showing {logs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {(currentPage - 1) * PAGE_SIZE + logs.length} of {meta?.total ?? logs.length} events.
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1 || logsQuery.isFetching}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages || logsQuery.isFetching}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
