import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Voucher, VoucherStatus } from '@/types'
import { VoucherCard } from '@/components/customer/VoucherCard'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { VoucherCardSkeleton, SkeletonList } from '@/components/ui/Skeleton'
import { Tag } from 'lucide-react'

const TABS: { key: VoucherStatus | 'active'; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'redeemed', label: 'Redeemed' },
  { key: 'expired', label: 'Expired' },
]

export function HomePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<VoucherStatus>('active')
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVouchers()
  }, [tab, profile])

  async function loadVouchers() {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('vouchers')
      .select('*, voucher_campaigns(*, merchants(*))')
      .eq('user_id', profile.id)
      .eq('status', tab)
      .order('issued_at', { ascending: false })
    setVouchers((data as Voucher[]) ?? [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-0 sticky top-0 z-20 border-b border-[#F5F5F7]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[34px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
            My Vouchers
          </h1>
          <button onClick={() => navigate('/profile')} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Avatar src={profile?.avatar_url} name={profile?.full_name} size={36} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 relative">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as VoucherStatus)}
              className={`pb-3 text-[17px] font-medium relative min-h-[44px] transition-colors ${
                tab === t.key ? 'text-[#1D1D1F]' : 'text-[#86868B]'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3B30] rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-28">
        {loading ? (
          <SkeletonList count={3}>
            <div className="mb-3"><VoucherCardSkeleton /></div>
          </SkeletonList>
        ) : vouchers.length === 0 ? (
          <EmptyState
            icon={<Tag size={48} />}
            title="No vouchers yet"
            body={tab === 'active' ? 'Vouchers you claim will appear here.' : undefined}
            action={tab === 'active' ? 'Browse vouchers' : undefined}
            onAction={tab === 'active' ? () => navigate('/browse') : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {vouchers.map((v, i) => (
              <VoucherCard key={v.id} voucher={v} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
