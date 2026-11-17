import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity as ActivityIcon,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Plus,
  Search,
  Users,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import {
  ActivityStatusBadge,
  ActivityTypeBadge,
} from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { Avatar } from '../../components/ui/Avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { BarChart } from '../../components/charts/Charts'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminApi, type AdminActivityInput } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { formatDate, formatTime, todayISO } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { Activity, ActivityType } from '../../types/domain'

const PAGE_SIZE = 10

const typeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'quran', label: 'Quran' },
  { value: 'tafseer', label: 'Tafseer' },
  { value: 'reading', label: 'Reading' },
  { value: 'habit', label: 'Habit' },
  { value: 'goal', label: 'Goal' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function ActivitiesOverviewPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [targetTab, setTargetTab] = useState<'group' | 'members'>('group')
  const [groupId, setGroupId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const debouncedUserSearch = useDebouncedValue(userSearch, 300)
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    activity_type: 'prayer' as ActivityType,
    scheduled_date: todayISO(),
    start_time: '',
    end_time: '',
    reminder_enabled: true,
  })

  const groupsQuery = useQuery({
    queryKey: ['admin', 'groups', 'activity-targets'],
    queryFn: () => adminApi.groups.list({ per_page: 100 }),
    enabled: createOpen,
    staleTime: 60_000,
  })

  const targetUsersQuery = useQuery({
    queryKey: ['admin', 'users', 'activity-targets', debouncedUserSearch],
    queryFn: () => adminApi.users.list({ q: debouncedUserSearch || undefined, per_page: 20 }),
    enabled: createOpen && targetTab === 'members',
    staleTime: 15_000,
  })

  const groups = groupsQuery.data?.items ?? []
  const targetUsers = targetUsersQuery.data?.items ?? []

  const filters = {
    q: debouncedSearch || undefined,
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
  }

  const activitiesQuery = useQuery({
    queryKey: ['admin', 'activities', debouncedSearch, type, status, page],
    queryFn: () => adminApi.activities.list({ ...filters, page, per_page: PAGE_SIZE }),
    staleTime: 20_000,
  })

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard(),
    staleTime: 60_000,
  })

  const activities: Activity[] = activitiesQuery.data?.items ?? []
  const stats = activitiesQuery.data?.stats ?? { total: 0, completed: 0, pending: 0, missed: 0 }
  const meta = activitiesQuery.data?.meta
  const currentPage = meta?.current_page ?? page
  const totalPages = Math.max(1, meta?.last_page ?? 1)
  const weekly = dashboardQuery.data?.charts.weekly ?? []

  const completeActivity = useMutation({
    mutationFn: (activity: Activity) => adminApi.activities.complete(activity.id),
    onSuccess: (activity) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'activities'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
      toast.success(`“${activity.title}” marked as completed.`)
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not update the activity.'), 'Update failed')
    },
  })

  const createActivity = useMutation({
    mutationFn: (payload: AdminActivityInput) => adminApi.activities.create(payload),
    onSuccess: (activity) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'activities'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
      toast.success(`“${activity.title}” now appears on the member's dashboard.`, 'Activity created')
      closeCreate()
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not create the activity.'), 'Create failed')
    },
  })

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId]
    )
  }

  const openCreate = () => {
    setTargetTab('group')
    setGroupId('')
    setUserSearch('')
    setSelectedUserIds([])
    setForm({
      title: '',
      description: '',
      activity_type: 'prayer',
      scheduled_date: todayISO(),
      start_time: '',
      end_time: '',
      reminder_enabled: true,
    })
    setCreateOpen(true)
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setGroupId('')
    setUserSearch('')
    setSelectedUserIds([])
  }

  const submitCreate = () => {
    if (!form.title.trim()) {
      toast.error('Give the activity a title.')
      return
    }
    if (!form.scheduled_date) {
      toast.error('Choose a date for the activity.')
      return
    }
    if (targetTab === 'group' && !groupId) {
      toast.error('Select a group to assign this activity to.')
      return
    }
    if (targetTab === 'members' && selectedUserIds.length === 0) {
      toast.error('Select at least one member to assign this activity to.')
      return
    }

    const payload: AdminActivityInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      activity_type: form.activity_type,
      scheduled_date: form.scheduled_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      reminder_enabled: form.reminder_enabled,
      ...(targetTab === 'group'
        ? { group_id: Number(groupId) }
        : { user_ids: selectedUserIds }),
    }

    createActivity.mutate(payload)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await adminApi.activities.export(filters)
      toast.success('The activities CSV has been downloaded.')
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export activities.'), 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setType('all')
    setStatus('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Activities overview"
        description="Every scheduled activity across the community, in one place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New activity
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} isLoading={exporting}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total activities" value={stats.total} icon={ActivityIcon} hint="all time" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="emerald" hint="on schedule" />
        <StatCard label="Pending" value={stats.pending} icon={Clock3} accent="sky" hint="still upcoming" />
        <StatCard label="Missed" value={stats.missed} icon={XCircle} accent="amber" hint="needs follow-up" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly activity volume</CardTitle>
          <p className="text-sm text-slate-500">Completed vs missed across the last seven days</p>
        </CardHeader>
        <CardContent>
          {weekly.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No activity data yet.</div>
          ) : (
            <BarChart data={weekly} height={190} showLegend />
          )}
        </CardContent>
      </Card>

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
                placeholder="Search activities or members…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search activities"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                containerClassName="w-40"
                value={type}
                onChange={(event) => {
                  setType(event.target.value)
                  setPage(1)
                }}
                options={typeOptions}
                aria-label="Filter by activity type"
              />
              <Select
                containerClassName="w-36"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </Select>
            </div>
          </div>

          {activitiesQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading activities…</div>
          ) : activitiesQuery.isError ? (
            <EmptyState
              icon={ActivityIcon}
              title="Could not load activities"
              description={errorMessage(activitiesQuery.error, 'The activities list is unavailable right now.')}
              action={<Button variant="outline" size="sm" onClick={() => void activitiesQuery.refetch()}>Try again</Button>}
            />
          ) : activities.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activities match your filters"
              description="Clear the filters or search for something else."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                      {activity.description && (
                        <p className="max-w-[220px] truncate text-xs text-slate-500">{activity.description}</p>
                      )}
                    </TableCell>
                    <TableCell><ActivityTypeBadge type={activity.activity_type} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      <p className="font-medium text-slate-700">{activity.user_name ?? 'Community member'}</p>
                      {activity.user_email && (
                        <p className="text-[10px] text-slate-400">{activity.user_email}</p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(activity.scheduled_date)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {formatTime(activity.start_time)} – {formatTime(activity.end_time)}
                      </span>
                    </TableCell>
                    <TableCell><ActivityStatusBadge status={activity.status} /></TableCell>
                    <TableCell className="text-right">
                      {activity.status === 'pending' ? (
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => completeActivity.mutate(activity)}
                          isLoading={completeActivity.isPending && completeActivity.variables?.id === activity.id}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
            <p>
              Showing {activities.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {(currentPage - 1) * PAGE_SIZE + activities.length} of {meta?.total ?? activities.length} activities
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1 || activitiesQuery.isFetching}
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
                disabled={currentPage >= totalPages || activitiesQuery.isFetching}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Create an activity"
        description="Assign a scheduled activity to a whole group or to specific members. It appears instantly on their dashboard."
        footer={
          <>
            <Button variant="outline" onClick={closeCreate}>
              Cancel
            </Button>
            <Button onClick={submitCreate} isLoading={createActivity.isPending}>
              <Plus className="h-4 w-4" />
              Create activity
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Morning Quran reading"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Activity type"
              value={form.activity_type}
              onChange={(event) =>
                setForm((current) => ({ ...current, activity_type: event.target.value as ActivityType }))
              }
              options={typeOptions.filter((option) => option.value !== 'all')}
            />
            <Input
              label="Date"
              type="date"
              value={form.scheduled_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, scheduled_date: event.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Start time (optional)"
              type="time"
              value={form.start_time}
              onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
            />
            <Input
              label="End time (optional)"
              type="time"
              value={form.end_time}
              onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))}
            />
          </div>
          <Textarea
            label="Description (optional)"
            placeholder="Add any notes or context for this activity"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />

          <div className="space-y-3 rounded-xl border border-slate-100 p-3.5">
            <p className="text-sm font-medium text-slate-800">Assign to</p>
            <Tabs
              value={targetTab}
              onChange={(value) => setTargetTab(value as 'group' | 'members')}
              items={[
                { id: 'group', label: 'A group', icon: <UsersRound className="h-3.5 w-3.5" /> },
                { id: 'members', label: 'Specific members', icon: <Users className="h-3.5 w-3.5" /> },
              ]}
            />

            {targetTab === 'group' ? (
              <Select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                aria-label="Select a group"
              >
                <option value="">
                  {groupsQuery.isLoading ? 'Loading groups…' : 'Select a group'}
                </option>
                {groups.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.members_count} members)
                  </option>
                ))}
              </Select>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search members by name or email…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    aria-label="Search members"
                  />
                </div>
                <div className="max-h-52 space-y-1.5 overflow-y-auto">
                  {targetUsersQuery.isLoading ? (
                    <p className="py-6 text-center text-sm text-slate-500">Loading members…</p>
                  ) : targetUsers.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                      No members match your search.
                    </p>
                  ) : (
                    targetUsers.map((candidate) => {
                      const selected = selectedUserIds.includes(candidate.id)
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => toggleUserSelection(candidate.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                            selected
                              ? 'border-brand-300 bg-brand-50/60'
                              : 'border-slate-100 hover:bg-slate-50'
                          )}
                        >
                          <Avatar name={candidate.name} src={candidate.avatar_url} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {candidate.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500">{candidate.email}</span>
                          </span>
                          <span
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-md border',
                              selected
                                ? 'border-brand-600 bg-brand-600 text-white'
                                : 'border-slate-300 text-transparent'
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              checked={form.reminder_enabled}
              onChange={(event) =>
                setForm((current) => ({ ...current, reminder_enabled: event.target.checked }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">Enable reminders</span>
              <span className="block text-xs text-slate-500">
                Members with notifications enabled will be reminded when this activity is about to start.
              </span>
            </span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
