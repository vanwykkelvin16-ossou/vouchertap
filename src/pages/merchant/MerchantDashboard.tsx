import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { RedemptionLog, VoucherCampaign } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { timeAgo } from '@/lib/utils'

export function MerchantDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState<{ id: string; business_name: string } | null>(null)
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 })
  const [feed, setFeed] = useState<RedemptionLog[]>([])
  const [campaigns, setCampaigns] = useState<VoucherCampaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function load() {
      const { data: m } = await supabase
        .from('merchants')
        .select('id, business_name')
        .eq('owner_user_id', profile!.id)
        .single()
      if (!m) { setLoading(false); return }
      setMerchant(m)

      const now = new Date()
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
      const monthStart = new Date(now); monthStart.setDate(1)

      const { data: logs } = await supabase
        .from('redemption_logs')
        .select('*, vouchers(voucher_code, voucher_campaigns(title, merchant_id)), profiles(full_name)')
        .order('redeemed_at', { ascending: false })
        .limit(50)

      const myLogs = (logs ?? []).filter(
        l => (l.vouchers as { voucher_campaigns: { merchant_id: string } })?.voucher_campaigns?.merchant_id === m.id
      ) as RedemptionLog[]

      setFeed(myLogs.slice(0, 20))
      setStats({
        today: myLogs.filter(l => new Date(l.redeemed_at) >= todayStart).length,
        week: myLogs.filter(l => new Date(l.redeemed_at) >= weekStart).length,
        month: myLogs.filter(l => new Date(l.redeemed_at) >= monthStart).length,
      })

      const { data: c } = await supabase
        .from('voucher_campaigns')
        .select('*')
        .eq('merchant_id', m.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setCampaigns((c as VoucherCampaign[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profile])

  useEffect(() => {
    if (!merchant) return
    const channel = supabase
      .channel('redemptions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'redemption_logs' }, async (payload) => {
        const { data } = await supabase
          .from('redemption_logs')
          .select('*, vouchers(voucher_code, voucher_campaigns(title, merchant_id)), profiles(full_name)')
          .eq('id', payload.new.id)
          .single()
        if (!data) return
        const log = data as RedemptionLog
        const merchantId = (log.vouchers as { voucher_campaigns: { merchant_id: string } })?.voucher_campaigns?.merchant_id
        if (merchantId === merchant.id) {
          setFeed(prev => [log, ...prev].slice(0, 20))
          setStats(prev => ({ ...prev, today: prev.today + 1, week: prev.week + 1, month: prev.month + 1 }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [merchant])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-6 pt-14">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-card" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white px-6 pt-14 pb-6 border-b border-[#F5F5F7]">
        <h1 className="text-[34px] font-bold text-[#1D1D1F] mb-1" style={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
        <p className="text-[17px] text-[#86868B]">{merchant?.business_name}</p>
      </div>

      <div className="px-4 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 mb-6">
          {[
            { label: 'Today', value: stats.today },
            { label: 'This week', value: stats.week },
            { label: 'This month', value: stats.month },
          ].map(s => (
            <Card key={s.label} className="p-4 text-center">
              <p className="text-[28px] font-bold text-[#FF3B30]">{s.value}</p>
              <p className="text-[12px] text-[#86868B] mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 mb-6">
          <Button variant="primary" size="md" className="flex-1 gap-2" onClick={() => navigate('/merchant/campaigns/new')}>
            <Plus size={18} /> New campaign
          </Button>
          <Button variant="secondary" size="md" className="flex-1 gap-2" onClick={() => navigate('/merchant/verify')}>
            <ShieldCheck size={18} /> Verify
          </Button>
        </div>

        {/* Live feed */}
        <Card className="mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F5F5F7]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30]" style={{ animation: 'pulse-dot 1s infinite' }} />
              <h2 className="text-[17px] font-semibold text-[#1D1D1F]">Live redemptions</h2>
            </div>
          </div>
          {feed.length === 0 ? (
            <p className="text-[15px] text-[#86868B] text-center py-8">No redemptions yet today</p>
          ) : (
            <AnimatePresence>
              {feed.map((log, i) => {
                const vc = log.vouchers as { voucher_campaigns: { title: string } } | null
                const p = log.profiles as { full_name: string } | null
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.02 }}
                    className={`flex items-center justify-between px-6 py-4 ${i < feed.length - 1 ? 'border-b border-[#F5F5F7]' : ''}`}
                  >
                    <div>
                      <p className="text-[15px] font-medium text-[#1D1D1F]">
                        {p?.full_name ?? 'Customer'}
                      </p>
                      <p className="text-[13px] text-[#86868B]">
                        {vc?.voucher_campaigns?.title ?? 'Voucher'}
                      </p>
                    </div>
                    <span className="text-[13px] text-[#86868B]">{timeAgo(log.redeemed_at)}</span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </Card>

        {/* Recent campaigns */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[#1D1D1F]">Recent campaigns</h2>
          <button onClick={() => navigate('/merchant/campaigns')} className="text-[#FF3B30] text-[15px] font-medium min-h-[44px]">
            See all
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {campaigns.map(c => (
            <Card key={c.id} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[17px] font-medium text-[#1D1D1F]">{c.title}</p>
                <span className={`text-[13px] font-medium px-2 py-1 rounded-full ${c.is_active ? 'bg-[#E8F8EE] text-[#34C759]' : 'bg-[#F5F5F7] text-[#86868B]'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {c.max_total && (
                <div className="mt-2">
                  <div className="flex justify-between text-[13px] text-[#86868B] mb-1">
                    <span>{c.total_issued} of {c.max_total} redeemed</span>
                    <span>{Math.round((c.total_issued / c.max_total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F5F5F7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF3B30] rounded-full transition-all"
                      style={{ width: `${Math.min(100, (c.total_issued / c.max_total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
