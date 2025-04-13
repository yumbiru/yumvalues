import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ViewerCount() {
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    const setupViewer = async () => {
      // Create a new viewer record
      const { data: viewer } = await supabase
        .from('active_viewers')
        .insert([{}])
        .select()
        .single();

      if (viewer) {
        setViewerId(viewer.id);
      }

      // Clean up old records (older than 20 seconds)
      const twentySecondsAgo = new Date(Date.now() - 20000).toISOString();
      await supabase
        .from('active_viewers')
        .delete()
        .lt('last_seen', twentySecondsAgo);

      // Subscribe to changes
      const channel = supabase
        .channel('active_viewers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'active_viewers' }, () => {
          updateViewerCount();
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    const updateViewerCount = async () => {
      const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
      const { count } = await supabase
        .from('active_viewers')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', fifteenSecondsAgo);

      setViewerCount(count || 0);
    };

    const updatePresence = async () => {
      if (viewerId && document.visibilityState === 'visible') {
        await supabase
          .from('active_viewers')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', viewerId);
      }
    };

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setupViewer();
    updateViewerCount();

    // Update presence more frequently when tab is visible
    const presenceInterval = setInterval(updatePresence, 10000);
    const countInterval = setInterval(updateViewerCount, 15000);

    return () => {
      if (viewerId) {
        // Remove viewer record when component unmounts
        supabase
          .from('active_viewers')
          .delete()
          .eq('id', viewerId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(presenceInterval);
      clearInterval(countInterval);
    };
  }, [viewerId]);

  return (
    <div className="flex items-center gap-2 bg-purple-900/50 px-3 py-1.5 rounded-full border border-purple-500/30">
      <Users className="w-4 h-4 text-purple-400" />
      <span className="text-purple-300 text-sm font-flashy">
        {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'} online
      </span>
    </div>
  );
}