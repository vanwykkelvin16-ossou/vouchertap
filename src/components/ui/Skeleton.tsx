import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-[#F5F5F7] rounded-lg overflow-hidden relative',
        'after:absolute after:inset-0 after:content-[""]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent',
        'after:animate-[shimmer_1.5s_infinite]',
        className
      )}
    />
  )
}

export function VoucherCardSkeleton() {
  return (
    <div className="bg-white border border-[#F5F5F7] rounded-card shadow-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

export function CampaignCardSkeleton() {
  return (
    <div className="bg-white border border-[#F5F5F7] rounded-card shadow-card overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-6 w-16 mb-2" />
        <Skeleton className="h-10 w-full rounded-btn" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3, children }: SkeletonProps & { children: React.ReactNode }) {
  return <>{Array.from({ length: count }).map((_, i) => <div key={i}>{children}</div>)}</>
}
