import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Voucher } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatVoucherValue, expiryLabel, daysUntil } from '@/lib/utils'

interface VoucherCardProps {
  voucher: Voucher
  index?: number
}

export function VoucherCard({ voucher, index = 0 }: VoucherCardProps) {
  const navigate = useNavigate()
  const campaign = voucher.voucher_campaigns
  const merchant = campaign?.merchants

  if (!campaign) return null

  const days = daysUntil(voucher.expires_at)
  const isUrgent = days >= 0 && days <= 7
  const label = expiryLabel(voucher.expires_at)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: index * 0.05 }}
      onClick={() => navigate(`/voucher/${voucher.id}`)}
      className="bg-white border border-[#F5F5F7] rounded-card shadow-card p-6 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar src={merchant?.logo_url} name={merchant?.business_name} size={40} />
        <div>
          <p className="text-[15px] font-medium text-[#1D1D1F]">{merchant?.business_name}</p>
          {merchant?.is_verified && (
            <span className="text-[12px] text-[#86868B]">Verified</span>
          )}
        </div>
      </div>
      <p className="text-[32px] font-bold text-[#1D1D1F] leading-none mb-2" style={{ letterSpacing: '-0.02em' }}>
        {formatVoucherValue(campaign.value_amount, campaign.value_type, campaign.description)}
      </p>
      <p className="text-[17px] text-[#86868B] mb-3">{campaign.title}</p>
      <div className="flex items-center justify-between">
        <Badge variant={isUrgent && days >= 0 ? 'red' : 'grey'}>
          {label}
        </Badge>
        <span className="font-mono text-[12px] text-[#86868B] tracking-wider">{voucher.voucher_code}</span>
      </div>
    </motion.div>
  )
}
