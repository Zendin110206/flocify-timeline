"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Announcement } from "@/lib/types";

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  tone: Announcement["tone"];
  is_active: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  created_by: string | null;
};

const mapAnnouncement = (row: AnnouncementRow): Announcement => ({
  id: row.id,
  title: row.title,
  message: row.message,
  tone: row.tone ?? "info",
  is_active: row.is_active ?? true,
  starts_at: row.starts_at ?? null,
  ends_at: row.ends_at ?? null,
  created_at: row.created_at,
  created_by: row.created_by ?? "SYSTEM",
});

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching announcements:", error);
    } else if (Array.isArray(data)) {
      setAnnouncements(data.map((row) => mapAnnouncement(row as AnnouncementRow)));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      fetchAnnouncements();
    }, 0);

    const channel = supabase
      .channel("realtime-announcements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          fetchAnnouncements();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnnouncements]);

  return {
    announcements,
    isLoading,
    refreshAnnouncements: fetchAnnouncements,
  };
}
