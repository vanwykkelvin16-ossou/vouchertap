import { formatTime } from '@/lib/utils'

interface LiveClockProps {
  time: Date | null
  size?: 'sm' | 'lg'
}

export function LiveClock({ time, size = 'lg' }: LiveClockProps) {
  return (
    <div className={`flex items-center gap-2 ${size === 'lg' ? 'gap-3' : 'gap-2'}`}>
      <span
        className={`font-mono font-bold text-[#1D1D1F] tabular-nums ${size === 'lg' ? 'text-[48px]' : 'text-[32px]'}`}
      >
        {time ? formatTime(time) : '--:--:--'}
      </span>
      <span className="flex items-center gap-1.5 bg-[#FFE5E5] px-2 py-1 rounded-full">
        <span
          className="w-2 h-2 rounded-full bg-[#FF3B30]"
          style={{ animation: 'pulse-dot 1s infinite' }}
        />
        <span className="text-[11px] font-bold text-[#FF3B30] tracking-wider">LIVE</span>
      </span>
    </div>
  )
}
