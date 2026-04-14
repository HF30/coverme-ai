"use client";

import { useMemo } from "react";
import { MOCK_LOCATIONS } from "@/lib/mock-data";
import type { Database } from "@/types/database";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export function useLocations() {
  const locations: Location[] = useMemo(() => MOCK_LOCATIONS, []);
  // When Supabase is connected, replace useMemo with a proper data-fetching hook
  return { locations, loading: false, error: null as string | null };
}
