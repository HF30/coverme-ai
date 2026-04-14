interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="mb-1 h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
