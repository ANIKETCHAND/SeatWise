/**
 * Timetable Management Hook.
 * 
 * Separates timetable search, filtering, and import state from TimetablePage UI.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { TimetableEntry } from '../types';

export interface TimetableFilter {
  program_id?: string;
  semester?: number;
  section?: string;
  day?: string;
}

export function useTimetable(initialFilter: TimetableFilter = {}) {
  const [filter, setFilter] = useState<TimetableFilter>(initialFilter);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = useCallback(async (currentFilter: TimetableFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTimetable(currentFilter);
      const list = Array.isArray(data) ? data : data?.entries || [];
      setEntries(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetable(filter);
  }, [fetchTimetable, filter]);

  const searchEntries = useCallback(async (query: string) => {
    if (!query.trim()) {
      return fetchTimetable(filter);
    }
    setLoading(true);
    try {
      const results = await api.searchTimetable(query);
      setEntries(Array.isArray(results) ? results : []);
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [fetchTimetable, filter]);

  return {
    entries,
    filter,
    setFilter,
    loading,
    error,
    refresh: () => fetchTimetable(filter),
    search: searchEntries,
  };
}

export default useTimetable;
