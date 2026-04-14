"use client";

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className = "" }: TabsProps) {
  return (
    <div
      className={`flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
