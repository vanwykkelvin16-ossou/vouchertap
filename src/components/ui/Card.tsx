import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-[#F5F5F7] rounded-card shadow-card',
        className
      )}
      {...props}
    />
  )
}
