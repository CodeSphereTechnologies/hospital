import { describe, it, expect, beforeEach } from 'vitest'
import {
  getJournalEntries,
  getJournalEntry,
  saveJournalEntry,
  deleteJournalEntry,
  ALL_MOODS,
  getMoodStyle,
} from '../lib/journalStorage'

describe('Journal Storage and Management', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('initializes with seed entries when storage is empty', () => {
    const entries = getJournalEntries()
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.some((e) => e.mood === 'Grateful')).toBe(true)
  })

  it('saves new entries with any mood and retrieves them', () => {
    const newEntry = saveJournalEntry({
      title: 'Energised Morning Workout',
      mood: 'Energised',
      entry_date: '2026-11-17',
      content: 'Felt very energised after early morning prayer and run.',
      tags: ['energy', 'fitness'],
    })

    expect(newEntry.id).toBeDefined()
    expect(newEntry.mood).toBe('Energised')

    const list = getJournalEntries()
    const found = list.find((e) => e.id === newEntry.id)
    expect(found).toBeDefined()
    expect(found?.title).toBe('Energised Morning Workout')
    expect(found?.mood).toBe('Energised')
  })

  it('saves entries with Hopeful and Struggling moods', () => {
    const hopeful = saveJournalEntry({
      title: 'Hopes for the community',
      mood: 'Hopeful',
      entry_date: '2026-11-17',
      content: 'Hopeful about our new learning initiatives and progress.',
    })

    const struggling = saveJournalEntry({
      title: 'Difficult afternoon',
      mood: 'Struggling',
      entry_date: '2026-11-17',
      content: 'Had a challenging day with focus but kept patience.',
    })

    expect(getJournalEntry(hopeful.id)?.mood).toBe('Hopeful')
    expect(getJournalEntry(struggling.id)?.mood).toBe('Struggling')
  })

  it('updates existing entries in storage', () => {
    const created = saveJournalEntry({
      title: 'Original Title',
      mood: 'Reflective',
      entry_date: '2026-11-17',
      content: 'Original content description for the entry.',
    })

    const updated = saveJournalEntry({
      id: created.id,
      title: 'Updated Title',
      mood: 'Calm',
      entry_date: '2026-11-17',
      content: 'Updated content description with more reflections.',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.title).toBe('Updated Title')
    expect(updated.mood).toBe('Calm')

    const retrieved = getJournalEntry(created.id)
    expect(retrieved?.title).toBe('Updated Title')
    expect(retrieved?.mood).toBe('Calm')
  })

  it('deletes entries correctly', () => {
    const created = saveJournalEntry({
      title: 'To Be Deleted',
      mood: 'Tired',
      entry_date: '2026-11-17',
      content: 'This entry will be deleted in the test.',
    })

    expect(getJournalEntry(created.id)).toBeDefined()
    deleteJournalEntry(created.id)
    expect(getJournalEntry(created.id)).toBeUndefined()
  })

  it('provides styles for all supported moods', () => {
    for (const mood of ALL_MOODS) {
      const style = getMoodStyle(mood.label)
      expect(style).toBeTruthy()
      expect(typeof style).toBe('string')
    }
  })
})
