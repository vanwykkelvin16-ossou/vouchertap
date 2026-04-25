import { cn } from '@/lib/utils'

type BadgeVariant = 'red' | 'green' | 'grey' | 'orange'

const variants: Record<BadgeVariant, string> = {
  red:    'bg-[#FFE5E5] text-[#FF3B30]',
  green:  'bg-[#E8F8EE] text-[#34C759]',
  grey:   'bg-[#F5F5F7] text-[#86868B]',
  orange: 'bg-orange-50 text-orange-500',
}

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'grey', className, children }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-[13px] font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
