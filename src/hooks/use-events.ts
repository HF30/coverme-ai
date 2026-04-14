"use client";

import { useMemo, useState, useCallback } from "react";
import {
  MOCK_EVENTS,
  MOCK_STAFFING_SUGGESTIONS,
  MOCK_EVENT_ACTUALS,
  MOCK_LOCATIONS,
  MOCK_ROLES,
  type MockEvent,
  type MockStaffingSuggestion,
} from "@/lib/mock-data";

export interface EventWithSuggestions extends MockEvent {
  suggestions: MockStaffingSuggestion[];
  staffingStatus: "fully_staffed" | "needs_staff" | "pending_approval";
  additionalStaffNeeded: number;
}

export function useEvents() {
  const [suggestions, setSuggestions] = useState(MOCK_STAFFING_SUGGESTIONS);

  const today = new Date().toISOString().split("T")[0];

  const upcomingEvents = useMemo(() => {
    return MOCK_EVENTS
      .filter((e) => e.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .map((event): EventWithSuggestions => {
        const eventSuggestions = suggestions.filter(
          (s) => s.event_id === event.id
        );
        const pendingSuggestions = eventSuggestions.filter(
          (s) => s.status === "pending"
        );
        const totalAdditional = eventSuggestions.reduce(
          (sum, s) => sum + (s.suggested_headcount - s.current_headcount),
          0
        );
        const approvedCount = eventSuggestions.filter(
          (s) => s.status === "approved" || s.status === "adjusted"
        ).length;

        let staffingStatus: EventWithSuggestions["staffingStatus"];
        if (eventSuggestions.length === 0) {
          staffingStatus = "fully_staffed";
        } else if (pendingSuggestions.length === 0) {
          staffingStatus = "fully_staffed";
        } else if (approvedCount > 0 && pendingSuggestions.length > 0) {
          staffingStatus = "needs_staff";
        } else {
          staffingStatus = "pending_approval";
        }

        return {
          ...event,
          suggestions: eventSuggestions,
          staffingStatus,
          additionalStaffNeeded: totalAdditional,
        };
      });
  }, [suggestions, today]);

  const pastEvents = useMemo(() => {
    return MOCK_EVENTS
      .filter((e) => e.event_date < today)
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  }, [today]);

  const eventActuals = useMemo(() => MOCK_EVENT_ACTUALS, []);

  const approveSuggestion = useCallback(
    (suggestionId: string, headcount?: number) => {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                status: "approved" as const,
                approved_by: "user-001",
                approved_headcount: headcount ?? s.suggested_headcount,
              }
            : s
        )
      );
    },
    []
  );

  const adjustSuggestion = useCallback(
    (suggestionId: string, headcount: number) => {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                status: "adjusted" as const,
                approved_by: "user-001",
                approved_headcount: headcount,
              }
            : s
        )
      );
    },
    []
  );

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId
          ? { ...s, status: "dismissed" as const }
          : s
      )
    );
  }, []);

  const pendingSuggestionsCount = useMemo(
    () => suggestions.filter((s) => s.status === "pending").length,
    [suggestions]
  );

  return {
    upcomingEvents,
    pastEvents,
    eventActuals,
    suggestions,
    approveSuggestion,
    adjustSuggestion,
    dismissSuggestion,
    pendingSuggestionsCount,
    locations: MOCK_LOCATIONS,
    roles: MOCK_ROLES,
    loading: false,
  };
}
