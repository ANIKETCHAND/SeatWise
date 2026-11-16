/**
 * Real-Time & Cross-Tab State Synchronization Service.
 * 
 * Synchronizes examination publishing, room modifications, batch updates,
 * and seating allocations across all accounts and open browser tabs using:
 * 1. BroadcastChannel('seatwise_sync')
 * 2. Supabase Realtime postgres_changes subscription (when configured)
 * 3. Window focus / document visibility refetch triggers
 * 4. LocalStorage event fallback for older environments
 */

import { useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export type SyncEventType =
  | 'EXAM_PUBLISHED'
  | 'EXAM_CREATED'
  | 'EXAM_UPDATED'
  | 'EXAM_DELETED'
  | 'SEATING_SAVED'
  | 'SEATING_PUBLISHED'
  | 'ROOM_UPDATED'
  | 'BATCH_UPDATED'
  | 'STUDENT_UPDATED'
  | 'TIMETABLE_UPDATED'
  | 'DATA_SYNC';

export interface SyncMessage {
  type: SyncEventType;
  payload?: any;
  timestamp: number;
  originId: string;
}

const CHANNEL_NAME = 'seatwise_sync';
const INSTANCE_ID = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

// BroadcastChannel instance
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel initialization failed; falling back to storage events:', e);
}

// Global list of registered listeners
const listeners = new Set<(msg: SyncMessage) => void>();

// Handle incoming BroadcastChannel messages
if (broadcastChannel) {
  broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data && event.data.originId !== INSTANCE_ID) {
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (err) {
          console.error('Error in sync listener:', err);
        }
      });
    }
  };
}

// Fallback window storage event listener for cross-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === CHANNEL_NAME && e.newValue) {
      try {
        const data: SyncMessage = JSON.parse(e.newValue);
        if (data.originId !== INSTANCE_ID) {
          listeners.forEach((listener) => listener(data));
        }
      } catch {}
    }
  });
}

// Initialize Supabase Realtime subscription once for the application
let realtimeSubscribed = false;
export const initRealtimeSubscription = () => {
  if (realtimeSubscribed || !isSupabaseConfigured || !supabase) return;
  realtimeSubscribed = true;

  try {
    supabase
      .channel('seatwise-public-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'examinations' },
        (payload) => {
          broadcastSync('DATA_SYNC', { table: 'examinations', change: payload });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seating_plans' },
        (payload) => {
          broadcastSync('DATA_SYNC', { table: 'seating_plans', change: payload });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seat_assignments' },
        (payload) => {
          broadcastSync('DATA_SYNC', { table: 'seat_assignments', change: payload });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          broadcastSync('ROOM_UPDATED', { table: 'rooms', change: payload });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'batches' },
        (payload) => {
          broadcastSync('BATCH_UPDATED', { table: 'batches', change: payload });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timetable_entries' },
        (payload) => {
          broadcastSync('TIMETABLE_UPDATED', { table: 'timetable_entries', change: payload });
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Failed to subscribe to Supabase Realtime channel:', err);
  }
};

// Auto-initialize realtime
if (typeof window !== 'undefined') {
  initRealtimeSubscription();
}

/**
 * Broadcast an event to all open tabs and accounts.
 */
export const broadcastSync = (type: SyncEventType, payload?: any) => {
  const msg: SyncMessage = {
    type,
    payload,
    timestamp: Date.now(),
    originId: INSTANCE_ID,
  };

  // 1. Broadcast via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(msg);
    } catch (err) {
      console.warn('BroadcastChannel postMessage failed:', err);
    }
  }

  // 2. Storage fallback for cross-tab notification
  try {
    localStorage.setItem(CHANNEL_NAME, JSON.stringify(msg));
  } catch {}

  // 3. Notify local listeners in the current tab as well
  listeners.forEach((listener) => {
    try {
      listener(msg);
    } catch (err) {
      console.error('Error in local sync listener:', err);
    }
  });
};

/**
 * React hook to listen for real-time changes and trigger refetching.
 * Automatically handles:
 * - BroadcastChannel events from any other tab
 * - Supabase Realtime postgres notifications
 * - Window focus events
 * - Visibility change events (tab becoming active)
 */
export const useDataSync = (onSync: (msg?: SyncMessage) => void, deps: React.DependencyList = []) => {
  const memoizedOnSync = useCallback(onSync, deps);

  useEffect(() => {
    // Listener for cross-tab and realtime broadcast
    const listener = (msg: SyncMessage) => {
      memoizedOnSync(msg);
    };

    listeners.add(listener);

    // Refetch when window regains focus (e.g. user switches tabs)
    const handleFocus = () => {
      memoizedOnSync({ type: 'DATA_SYNC', timestamp: Date.now(), originId: 'focus' });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        memoizedOnSync({ type: 'DATA_SYNC', timestamp: Date.now(), originId: 'visibility' });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [memoizedOnSync]);
};
