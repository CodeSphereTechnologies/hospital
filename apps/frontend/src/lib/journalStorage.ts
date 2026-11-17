import type { JournalEntry } from '../types/domain'
import { journalEntries as initialEntries } from './mockData'

const STORAGE_KEY = 'daei.journal.entries'

export interface MoodOption {
  label: string
  className: string
}

export const ALL_MOODS: MoodOption[] = [
  { label: 'Grateful', className: 'bg-emerald-100 text-emerald-700' },
  { label: 'Reflective', className: 'bg-sky-100 text-sky-700' },
  { label: 'Calm', className: 'bg-brand-100 text-brand-700' },
  { label: 'Tired', className: 'bg-amber-100 text-amber-700' },
  { label: 'Energised', className: 'bg-violet-100 text-violet-700' },
  { label: 'Hopeful', className: 'bg-teal-100 text-teal-700' },
  { label: 'Struggling', className: 'bg-rose-100 text-rose-700' },
]

export function getMoodStyle(mood: string): string {
  const match = ALL_MOODS.find((m) => m.label.toLowerCase() === mood.toLowerCase())
  return match?.className ?? 'bg-slate-100 text-slate-700'
}

export function getJournalEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return initialEntries
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialEntries))
      return initialEntries
    }
    const parsed = JSON.parse(raw) as JournalEntry[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialEntries
  } catch {
    return initialEntries
  }
}

export function getJournalEntry(id: number): JournalEntry | undefined {
  const list = getJournalEntries()
  return list.find((item) => item.id === id)
}

export function saveJournalEntry(
  entry: Omit<JournalEntry, 'id'> & { id?: number }
): JournalEntry {
  const list = getJournalEntries()

  if (entry.id) {
    const index = list.findIndex((item) => item.id === entry.id)
    if (index !== -1) {
      const updated: JournalEntry = {
        ...list[index],
        ...entry,
        id: entry.id,
      }
      const nextList = [...list]
      nextList[index] = updated
      persistEntries(nextList)
      return updated
    }
  }

  // Generate new unique ID
  const maxId = list.reduce((max, item) => Math.max(max, item.id || 0), 0)
  const newEntry: JournalEntry = {
    ...entry,
    id: maxId + 1,
    tags: entry.tags || [],
  }
  const nextList = [newEntry, ...list]
  persistEntries(nextList)
  return newEntry
}

export function deleteJournalEntry(id: number): void {
  const list = getJournalEntries()
  const nextList = list.filter((item) => item.id !== id)
  persistEntries(nextList)
}

function persistEntries(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (err) {
    console.error('Failed to persist journal entries:', err)
  }
}
