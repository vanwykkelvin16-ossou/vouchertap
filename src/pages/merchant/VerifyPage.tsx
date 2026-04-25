import { useState } from 'react'
import { CheckCircle2, Clock, Sparkles, User, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useVerification } from '@/lib/hooks/useVerification'
import { VerificationBand } from '@/components/ui/VerificationBand'
import { LiveClock } from '@/components/ui/LiveClock'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Voucher } from '@/types'
import { formatDate } from '@/lib/utils'

const CHECKS = [
  {
    icon: CheckCircle2,
    title: 'Color matches',
    getBody: (colorName: string) => `Customer's band should show ${colorName}`,
  },
  {
    icon: Clock,
    title: 'Time matches',
    getBody: () => 'Customer\'s clock must be within 5 seconds of this one',
  },
  {
    icon: Sparkles,
    title: 'Screen is live',
    getBody: () => 'Shimmer is flowing, dot is pulsing. A frozen screen is a screenshot.',
  },
  {
    icon: User,
    title: 'Customer name shown',
    getBody: () => 'Ask for ID if the name doesn\'t match',
  },
]

export function VerifyPage() {
  const { data: verif, serverTime } = useVerification(5000)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ voucher: Voucher | null; status: 'valid' | 'redeemed' | 'expired' | 'revoked' | 'not_found' | null }>({ voucher: null, status: null })
  const [checking, setChecking] = useState(false)

  async function checkCode() {
    if (!code.trim()) return
    setChecking(true)
    const { data } = await supabase
      .from('vouchers')
      .select('*, voucher_campaigns(title)')
      .eq('voucher_code', code.trim().toUpperCase())
      .single()
    setChecking(false)

    if (!data) { setResult({ voucher: null, status: 'not_found' }); return }
    const v = data as Voucher
    if (v.status === 'active' && new Date(v.expires_at) < new Date()) {
      setResult({ voucher: v, status: 'expired' })
    } else {
      setResult({ voucher: v, status: v.status as 'valid' | 'redeemed' | 'expired' | 'revoked' })
    }
  }

  const colorName = verif?.todays_color_name ?? '...'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Color band */}
      <VerificationBand data={verif} />

      <div className="px-4 py-6">
        {/* Clock */}
        <div className="flex flex-col items-center mb-8">
          <LiveClock time={serverTime} />
        </div>

        {/* Checks */}
        <h2 className="text-[22px] font-bold text-[#1D1D1F] mb-3">What to check</h2>
        <div className="flex flex-col gap-3 mb-8">
          {CHECKS.map(check => (
            <Card key={check.title} className="p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#FFE5E5] flex items-center justify-center flex-shrink-0 mt-0.5">
                <check.icon size={16} className="text-[#FF3B30]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1D1D1F]">{check.title}</p>
                <p className="text-[14px] text-[#86868B] mt-0.5">{check.getBody(colorName)}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Code lookup */}
        <h2 className="text-[22px] font-bold text-[#1D1D1F] mb-3">Voucher lookup</h2>
        <Card className="p-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
              <input
                value={code}
                onChange={e => { setCode(e.target.value); setResult({ voucher: null, status: null }) }}
                onKeyDown={e => e.key === 'Enter' && checkCode()}
                placeholder="Enter 8-character code"
                className="w-full bg-[#FAFAFA] pl-9 pr-4 py-3 rounded-xl text-[17px] font-mono uppercase tracking-wider placeholder:text-[#86868B] placeholder:normal-case placeholder:tracking-normal border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30]"
                maxLength={8}
              />
            </div>
            <Button size="md" loading={checking} onClick={checkCode}>Check</Button>
          </div>

          {result.status && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              result.status === 'valid' ? 'bg-[#E8F8EE]' : 'bg-[#FFE5E5]'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                result.status === 'valid' ? 'bg-[#34C759]' : 'bg-[#FF3B30]'
              }`}>
                {result.status === 'valid' ? (
                  <CheckCircle2 size={18} className="text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">✕</span>
                )}
              </div>
              <div>
                <p className={`text-[15px] font-semibold ${result.status === 'valid' ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                  {result.status === 'valid' && 'Valid — not yet redeemed'}
                  {result.status === 'redeemed' && `Already redeemed${result.voucher?.redeemed_at ? ' on ' + formatDate(result.voucher.redeemed_at) : ''}`}
                  {result.status === 'expired' && `Expired${result.voucher?.expires_at ? ' on ' + formatDate(result.voucher.expires_at) : ''}`}
                  {result.status === 'revoked' && 'This voucher has been revoked'}
                  {result.status === 'not_found' && 'Code not found. Check the spelling and try again.'}
                </p>
                {result.voucher && (
                  <p className="text-[13px] text-[#86868B] mt-0.5">
                    {(result.voucher.voucher_campaigns as { title: string } | undefined)?.title}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
