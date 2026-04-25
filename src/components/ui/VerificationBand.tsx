import { DailyVerification } from '@/types'

interface VerificationBandProps {
  data: DailyVerification | null
}

export function VerificationBand({ data }: VerificationBandProps) {
  const color = data?.todays_color_hex ?? '#FF3B30'
  const name = data?.todays_color_name ?? '...'

  return (
    <div
      className="w-full h-20 flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: color }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
          animation: 'shimmer-band 2s infinite linear',
          backgroundSize: '200% 100%',
        }}
      />
      <span className="relative z-10 text-white font-bold tracking-widest text-[15px] uppercase select-none">
        TODAY: {name}
      </span>
    </div>
  )
}
