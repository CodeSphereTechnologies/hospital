import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Clock3, Pencil } from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { ActivityStatusBadge, ActivityTypeBadge } from '../../components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/shared/EmptyState'
import { activitiesApi } from '../../lib/api/endpoints'
import { ApiError } from '../../lib/api/client'
import { formatDate, formatTime } from '../../lib/format'

export function ActivityDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const activityQuery = useQuery({
    queryKey: ['activities', 'detail', id],
    queryFn: () => activitiesApi.get(Number(id)),
    enabled: Boolean(id && Number.isFinite(Number(id))),
    staleTime: 30_000,
  })

  if (activityQuery.isLoading) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading activity…</div>
  }

  if (activityQuery.isError || !activityQuery.data) {
    return (
      <EmptyState
        title="Could not load activity"
        description={
          activityQuery.error instanceof ApiError
            ? activityQuery.error.message
            : 'This activity is unavailable right now.'
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void activityQuery.refetch()}>
              Try again
            </Button>
            <Link to="/app/activities">
              <Button size="sm">Back to activities</Button>
            </Link>
          </div>
        }
      />
    )
  }

  const activity = activityQuery.data

  return (
    <div className="space-y-6">
      <Link
        to="/app/activities"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to activities
      </Link>
      <PageHeader
        eyebrow="Personal activity"
        title={activity.title}
        description="Details for your scheduled activity."
        actions={
          <Link to={`/app/activities/${activity.id}/edit`}>
            <Button size="sm">
              <Pencil className="h-4 w-4" />
              Edit activity
            </Button>
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Activity details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <ActivityTypeBadge type={activity.activity_type} />
            <ActivityStatusBadge status={activity.status} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-500">Date</p>
                <p className="mt-1 text-sm text-slate-800">{formatDate(activity.scheduled_date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-500">Time</p>
                <p className="mt-1 text-sm text-slate-800">
                  {formatTime(activity.start_time)}
                  {activity.end_time ? ` – ${formatTime(activity.end_time)}` : ''}
                </p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {activity.description || 'No description provided.'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Reminder</p>
            <p className="mt-1 text-sm text-slate-800">
              {activity.reminder_enabled ? 'Enabled' : 'Off'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
