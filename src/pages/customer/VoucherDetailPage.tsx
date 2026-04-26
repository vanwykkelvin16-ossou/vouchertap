import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle, ChevronDown, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Voucher } from '@/types'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!voucher) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-64 bg-[#F5F5F7]">
        {campaign.image_url ? (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FFE5E5] to-[#F5F5F7]">
            <span className="text-[52px] font-bold text-[#FF3B30]" style={{ letterSpacing: '-0.03em' }}>
              {formatVoucherValue(campaign.value_amount, campaign.value_type)}
            </span>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-14 left-4 w-9 h-9 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={16} className="text-[#1D1D1F]" />
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-[28px] -mt-6 relative px-5 pt-6 pb-40">

        {/* Merchant */}
        <div className="flex items-center gap-3 mb-5">
          <Avatar src={merchant.logo_url} name={merchant.business_name} size={40} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold text-[#1D1D1F]">{merchant.business_name}</span>
              {merchant.is_verified && <CheckCircle size={14} className="text-[#34C759]" />}
            </div>
            {merchant.city && <span className="text-[13px] text-[#86868B]">{merchant.city}</span>}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[26px] font-bold text-[#1D1D1F] leading-snug mb-3" style={{ letterSpacing: '-0.02em' }}>
          {campaign.title}
        </h1>

        {/* Status row */}
        <div className="flex items-center gap-2 mb-5">
          {isActive ? (
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full ${
              isUrgent ? 'bg-[#FFE5E5] text-[#FF3B30]' : 'bg-[#E8F9EE] text-[#34C759]'
            }`}>
              <Clock size={11} />
              {expiryLabel(voucher.expires_at)}
            </span>
          ) : (
            <span className="inline-flex items-center text-[13px] font-medium px-3 py-1.5 rounded-full bg-[#F5F5F7] text-[#86868B]">
              {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
            </span>
          )}
          <span className="font-mono text-[13px] text-[#86868B] tracking-[0.12em]">
            {voucher.voucher_code}
          </span>
        </div>

        {/* Description */}
        {campaign.description && (
          <p className="text-[15px] text-[#86868B] leading-relaxed mb-5">{campaign.description}</p>
        )}

        {/* Divider */}
        <div className="h-px bg-[#F5F5F7] mb-5" />

        {/* Validity */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[13px] text-[#86868B]">
            Valid {formatDate(campaign.valid_from)} – {formatDate(campaign.valid_until)}
          </span>
        </div>

        {/* Terms */}
        {campaign.terms && (
          <div className="bg-[#FAFAFA] rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowTerms(!showTerms)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-[14px] font-medium text-[#1D1D1F] min-h-[44px]"
            >
              Terms & conditions
              <motion.div animate={{ rotate: showTerms ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} className="text-[#86868B]" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {showTerms && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-[13px] text-[#86868B] leading-relaxed">{campaign.terms}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sticky CTA — covers safe area properly */}
      {isActive && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <div className="px-5 pt-4 border-t border-[#F5F5F7]">
            <Button fullWidth onClick={() => setConfirmOpen(true)}>
              Redeem now
            </Button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="text-center pb-2">
          <div className="w-14 h-14 bg-[#FFE5E5] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎟️</span>
          </div>
          <h2 className="text-[22px] font-bold text-[#1D1D1F] mb-2">Ready to redeem?</h2>
          <p className="text-[15px] text-[#86868B] mb-7 max-w-xs mx-auto leading-relaxed">
            Only tap when you're at the counter.<br />This cannot be undone.
          </p>
          <div className="flex flex-col gap-3">
            <Button fullWidth loading={redeeming} onClick={handleRedeem}>
              Yes, redeem now
            </Button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="text-[15px] text-[#86868B] py-3 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
