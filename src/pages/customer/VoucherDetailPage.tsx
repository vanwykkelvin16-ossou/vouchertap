import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Voucher } from '@/types'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatVoucherValue, formatDate, expiryLabel, daysUntil } from '@/lib/utils'
import { toast } from 'sonner'

export function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTerms, setShowTerms] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vouchers')
        .select('*, voucher_campaigns(*, merchants(*))')
        .eq('id', id)
        .single()
      setVoucher(data as Voucher)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleRedeem() {
    if (!voucher) return
    setRedeeming(true)
    const { data, error } = await supabase.rpc('redeem_voucher', { p_voucher_id: voucher.id })
    setRedeeming(false)
    setConfirmOpen(false)

    if (error || !data?.success) {
      toast.error(data?.error ?? 'Could not redeem. Try again.')
      return
    }

    navigate(`/voucher/${voucher.id}/redeemed`, { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!voucher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#86868B]">Voucher not found</p>
      </div>
    )
  }

  const campaign = voucher.voucher_campaigns!
  const merchant = campaign.merchants!
  const days = daysUntil(voucher.expires_at)
  const isUrgent = days >= 0 && days <= 7
  const isActive = voucher.status === 'active'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Hero image */}
      <div className="relative h-72 bg-[#FFE5E5]">
        {campaign.image_url ? (
          <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold text-[#FF3B30]">
              {formatVoucherValue(campaign.value_amount, campaign.value_type)}
            </span>
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Content card overlapping hero */}
      <div className="relative -mt-6 bg-white rounded-t-hero px-6 pt-6 pb-32">
        {/* Merchant row */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={merchant.logo_url} name={merchant.business_name} size={44} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[17px] font-semibold text-[#1D1D1F]">{merchant.business_name}</p>
              {merchant.is_verified && <CheckCircle size={16} className="text-[#34C759]" />}
            </div>
            {merchant.city && <p className="text-[13px] text-[#86868B]">{merchant.city}</p>}
          </div>
        </div>

        {/* Value */}
        <h1 className="text-[40px] font-bold text-[#1D1D1F] mb-2" style={{ letterSpacing: '-0.02em' }}>
          {formatVoucherValue(campaign.value_amount, campaign.value_type, campaign.description)}
        </h1>

        {/* Title & status */}
        <p className="text-[17px] text-[#86868B] mb-4">{campaign.title}</p>

        <div className="flex items-center gap-2 mb-6">
          <Badge variant={voucher.status === 'active' ? (isUrgent ? 'red' : 'green') : 'grey'}>
            {voucher.status === 'active' ? expiryLabel(voucher.expires_at) : voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
          </Badge>
          <span className="font-mono text-[13px] text-[#86868B] tracking-wider">{voucher.voucher_code}</span>
        </div>

        {/* Description */}
        {campaign.description && (
          <p className="text-[17px] text-[#1D1D1F] leading-relaxed mb-6">{campaign.description}</p>
        )}

        <div className="flex flex-col gap-1 text-[15px] text-[#86868B] mb-6">
          <span>Valid {formatDate(campaign.valid_from)} – {formatDate(campaign.valid_until)}</span>
        </div>

        {/* Terms */}
        {campaign.terms && (
          <div className="border border-[#F5F5F7] rounded-card overflow-hidden mb-6">
            <button
              onClick={() => setShowTerms(!showTerms)}
              className="w-full flex items-center justify-between p-4 text-[15px] font-medium text-[#1D1D1F] min-h-[44px]"
            >
              Terms & conditions
              <motion.div animate={{ rotate: showTerms ? 180 : 0 }}>
                <ChevronDown size={18} className="text-[#86868B]" />
              </motion.div>
            </button>
            <AnimatePresence>
              {showTerms && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-[15px] text-[#86868B] leading-relaxed">{campaign.terms}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F5F7] p-4 pb-safe">
          <Button fullWidth onClick={() => setConfirmOpen(true)}>
            Redeem now
          </Button>
        </div>
      )}

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="text-center pb-2">
          <h2 className="text-[28px] font-bold text-[#1D1D1F] mb-3">Ready to redeem?</h2>
          <p className="text-[17px] text-[#86868B] mb-8 max-w-xs mx-auto">
            Only tap when you're at the counter. This cannot be undone.
          </p>
          <div className="flex flex-col gap-3">
            <Button fullWidth loading={redeeming} onClick={handleRedeem}>
              Yes, redeem now
            </Button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="text-[17px] text-[#86868B] py-3 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
