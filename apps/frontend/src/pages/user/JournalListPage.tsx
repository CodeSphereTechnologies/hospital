import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/shared/EmptyState'
import { getJournalEntries, getMoodStyle, ALL_MOODS } from '../../lib/journalStorage'
import type { JournalEntry } from '../../types/domain'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'

export function JournalListPage() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => getJournalEntries())
  const [search, setSearch] = useState('')
  const [mood, setMood] = useState('all')

  useEffect(() => {
    setEntries(getJournalEntries())
  }, [])

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        const matchesSearch =
          !search ||
          entry.title.toLowerCase().includes(search.toLowerCase()) ||
          entry.content.toLowerCase().includes(search.toLowerCase())
        const matchesMood =
          mood === 'all' || entry.mood.toLowerCase() === mood.toLowerCase()
        return matchesSearch && matchesMood
      }),
    [entries, search, mood]
  )

  const moodNames = useMemo(() => {
    const predefined = ALL_MOODS.map((m) => m.label)
    const existing = entries.map((entry) => entry.mood).filter(Boolean)
    return ['all', ...Array.from(new Set([...predefined, ...existing]))]
  }, [entries])

  const streak = entries.length > 0 ? Math.min(entries.length, 4) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Journal"
        description="Reflect on your days, capture lessons and watch your thinking evolve."
        actions={
          <Link to="/app/journal/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New entry
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6 sm:p-7">
            <span className="rounded-xl bg-brand-50 p-3 text-brand-600">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Entries
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{entries.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6 sm:p-7">
            <span className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Current streak
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{streak} days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6 sm:p-7">
            <span className="rounded-xl bg-sky-50 p-3 text-sky-600">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Last entry
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {entries[0] ? formatDate(entries[0].entry_date) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your journal…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            aria-label="Search journal entries"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {moodNames.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMood(option)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors',
                mood.toLowerCase() === option.toLowerCase()
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200'
              )}
            >
              {option === 'all' ? 'All moods' : option}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No journal entries found"
          description="Try a different search or write your first entry."
          action={
            <Link to="/app/journal/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Write an entry
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((entry) => {
            const moodStyle = getMoodStyle(entry.mood)
            return (
              <Card key={entry.id} className="group transition-all hover:-translate-y-0.5 hover:shadow-card">
                <CardContent className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-900">{entry.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(entry.entry_date, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <Badge className={moodStyle}>{entry.mood}</Badge>
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
                    {entry.content}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    {entry.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500"
                      >
                        #{tag}
                      </span>
                    ))}
                    <Link
                      to={`/app/journal/${entry.id}`}
                      className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Read & edit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
