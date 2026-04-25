import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { VoucherCampaign } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton'
import { formatDate, isExpired } from '@/lib/utils'
import { motion } from 'framer-motion'

export function CampaignsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<VoucherCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [merchantId, setMerchantId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    async function load() {
      const { data: m } = await supabase
        .from('merchants')
        .select('id')
        .eq('owner_user_id', profile!.id)
        .single()
      if (!m) { setLoading(false); return }
      setMerchantId(m.id)

      const { data } = await supabase
        .from('voucher_campaigns')
        .select('*')
        .eq('merchant_id', m.id)
        .order('created_at', { ascending: false })
      setCampaigns((data as VoucherCampaign[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profile])

  function getCampaignStatus(c: VoucherCampaign) {
    if (isExpired(c.valid_until)) return 'Expired'
    if (!c.is_active) return 'Inactive'
    return 'Active'
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white px-6 pt-14 pb-6 border-b border-[#F5F5F7] flex items-center justify-between">
        <h1 className="text-[34px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>Campaigns</h1>
        <Button size="md" className="gap-1.5" onClick={() => navigate('/merchant/campaigns/new')}>
          <Plus size={16} /> New
        </Button>
      </div>

      <div className="px-4 pb-12 pt-4">
        {loading ? (
          <SkeletonList count={4}>
            <div className="mb-3"><Skeleton className="h-28 rounded-card" /></div>
          </SkeletonList>
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            body="Create your first campaign to start reaching customers."
            action="Create campaign"
            onAction={() => navigate('/merchant/campaigns/new')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((c, i) => {
              const status = getCampaignStatus(c)
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.04 }}
                >
                  <Card
                    className="p-6 cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => navigate(`/merchant/campaigns/${c.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-[17px] font-semibold text-[#1D1D1F] flex-1 mr-3">{c.title}</h3>
                      <Badge variant={status === 'Active' ? 'green' : status === 'Inactive' ? 'grey' : 'orange'}>
                        {status}
                      </Badge>
                    </div>
                    <p className="text-[13px] text-[#86868B] mb-3">
                      Valid {formatDate(c.valid_from)} – {formatDate(c.valid_until)}
                    </p>
                    {c.max_total ? (
                      <div>
                        <div className="flex justify-between text-[13px] text-[#86868B] mb-1">
                          <span>{c.total_issued} of {c.max_total} redeemed</span>
                          <span>{Math.round((c.total_issued / c.max_total) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-[#F5F5F7] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FF3B30] rounded-full"
                            style={{ width: `${Math.min(100, (c.total_issued / c.max_total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#86868B]">{c.total_issued} redeemed</p>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
