import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
}

export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  return (
    <div
      className={cn('rounded-full flex items-center justify-center overflow-hidden bg-[#FFE5E5] flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold text-[#FF3B30]" style={{ fontSize: size * 0.35 }}>
          {initials}
        </span>
      )}
    </div>
  )
}
