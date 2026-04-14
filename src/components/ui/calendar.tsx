"use client";

interface WeekCalendarProps {
  weekStart: string; // ISO date string for Monday
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  className?: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekCalendar({
  weekStart,
  selectedDate,
  onDateSelect,
  className = "",
}: WeekCalendarProps) {
  const monday = new Date(weekStart + "T00:00:00");
  const today = new Date().toISOString().split("T")[0];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d.toISOString().split("T")[0],
      dayNum: d.getDate(),
      label: DAY_LABELS[i],
      isToday: d.toISOString().split("T")[0] === today,
    };
  });

  return (
    <div className={`flex gap-1 ${className}`}>
      {days.map((day) => (
        <button
          key={day.date}
          onClick={() => onDateSelect?.(day.date)}
          className={`flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-lg py-2 text-center transition-colors ${
            selectedDate === day.date
              ? "bg-blue-600 text-white"
              : day.isToday
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="text-xs font-medium">{day.label}</span>
          <span className="text-lg font-semibold leading-tight">
            {day.dayNum}
          </span>
        </button>
      ))}
    </div>
  );
}
