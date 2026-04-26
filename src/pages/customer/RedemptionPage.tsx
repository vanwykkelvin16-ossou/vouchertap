import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Voucher } from '@/types'
import { VerificationBand } from '@/components/ui/VerificationBand'
import { LiveClock } from '@/components/ui/LiveClock'
import { useVerification } from '@/lib/hooks/useVerification'
import { formatDate } from '@/lib/utils'

export function RedemptionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: verif, serverTime } = useVerification(1000)
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [countdown, setCountdown] = useState(10)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vouchers')
        .select('*, voucher_campaigns(*, merchants(*))')
        .eq('id', id)
        .single()
      setVoucher(data as Voucher)
    }
    load()
  }, [id])

  useEffect(() => {
    setCountdown(10)
    if (countRef.current) clearInterval(countRef.current)
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => { if (countRef.current) clearInterval(countRef.current) }
  }, [id])

  const campaign = voucher?.voucher_campaigns
  const merchant = campaign?.merchants
  const firstName = profile?.full_name?.split(' ')[0] ?? 'You'

  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      {/* Animated grain texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          animation: 'grain 0.5s steps(1) infinite',
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Verification color band */}
        <motion.div
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <VerificationBand data={verif} />
        </motion.div>

        <div className="flex flex-col items-center px-6 py-8 flex-1">
          {/* Live clock */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.2 }}
            className="mb-8"
          >
            <LiveClock time={serverTime} />
          </motion.div>

          {/* Checkmark */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
            className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-card mb-6"
          >
            <CheckCircle size={64} className="text-[#FF3B30]" strokeWidth={1.5} />
          </motion.div>

          {/* REDEEMED text with gradient sweep through letters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="text-center mb-2"
          >
            <span
              className="text-[48px] font-black block"
              style={{
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #C41E3A 0%, #FF3B30 25%, #FF7F50 50%, #FF3B30 75%, #C41E3A 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer-text 2.5s infinite linear',
              }}
            >
              REDEEMED
            </span>
            <p className="text-[20px] text-[#86868B] mt-1">for {firstName}</p>
          </motion.div>

          {/* Voucher details card */}
          {voucher && campaign && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.6 }}
              className="w-full max-w-sm bg-white border border-[#F5F5F7] rounded-card shadow-card p-6 mt-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#FFE5E5] flex items-center justify-center overflow-hidden">
                  {merchant?.logo_url ? (
                    <img src={merchant.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#FF3B30] font-bold text-sm">
                      {merchant?.business_name?.[0] ?? 'M'}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-[#1D1D1F]">{merchant?.business_name}</p>
              </div>

              <p className="text-[17px] text-[#86868B] mb-3">{campaign.title}</p>

              <div className="bg-[#FAFAFA] rounded-xl p-4 mb-3">
                <p className="text-[11px] font-medium text-[#86868B] uppercase tracking-wider mb-1">Voucher code</p>
                <p className="font-mono text-[22px] font-bold text-[#1D1D1F] tracking-[0.2em]">
                  {voucher.voucher_code}
                </p>
              </div>

              <p className="text-[13px] text-[#86868B]">
                Redeemed {voucher.redeemed_at ? formatDate(voucher.redeemed_at) : 'just now'}
              </p>
            </motion.div>
          )}

          {/* Instruction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-2 mt-6 text-[17px] text-[#86868B]"
          >
            <span>Show this screen to staff</span>
            <ArrowUp size={18} />
          </motion.div>

          {/* Done button */}
          <div className="mt-8">
            {countdown > 0 ? (
              <p className="text-[17px] text-[#86868B] text-center">Done in {countdown}s</p>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate('/', { replace: true })}
                className="text-[17px] font-medium text-[#FF3B30] min-h-[44px] px-6"
              >
                Done
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
