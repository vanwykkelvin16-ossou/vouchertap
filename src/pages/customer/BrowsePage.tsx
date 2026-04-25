import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { VoucherCampaign } from '@/types'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { CampaignCardSkeleton, SkeletonList } from '@/components/ui/Skeleton'
import { formatVoucherValue, formatDate } from '@/lib/utils'

const CATEGORIES = ['All', 'Food', 'Retail', 'Services', 'Entertainment', 'Beauty']

export function BrowsePage() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [campaigns, setCampaigns] = useState<VoucherCampaign[]>([])
  const [featured, setFeatured] = useState<VoucherCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCampaigns()
  }, [category, query])

  async function loadCampaigns() {
    setLoading(true)
    let q = supabase
      .from('voucher_campaigns')
      .select('*, merchants(*)')
      .eq('is_active', true)
      .gt('valid_until', new Date().toISOString())

    if (category !== 'All') q = q.eq('category', category)
    if (query) q = q.ilike('title', `%${query}%`)

    const { data } = await q.order('created_at', { ascending: false })
    const all = (data as VoucherCampaign[]) ?? []
    setFeatured(all.filter(c => c.is_featured))
    setCampaigns(all)
    setLoading(false)
  }

  async function handleClaim(campaign: VoucherCampaign) {
    if (!profile || claiming) return
    setClaiming(campaign.id)
    const { data, error } = await supabase.rpc('claim_voucher', { p_campaign_id: campaign.id })
    setClaiming(null)

    if (error || !data?.success) {
      toast.error(data?.error ?? 'Could not claim voucher. Try again.')
      return
    }

    setClaimed(prev => new Set(prev).add(campaign.id))
    toast.success('Voucher saved to My Vouchers')
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.3 },
      colors: ['#FF3B30', '#ffffff', '#FFE5E5'],
    })
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Search header */}
      <div className="bg-white px-4 pt-14 pb-4 sticky top-0 z-20 border-b border-[#F5F5F7]">
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search vouchers and merchants"
            className="w-full bg-[#FAFAFA] pl-10 pr-4 py-3 rounded-xl text-[17px] text-[#1D1D1F] placeholder:text-[#86868B] border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30]"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[14px] font-medium transition-colors min-h-[36px] ${
                category === cat
                  ? 'bg-[#FF3B30] text-white'
                  : 'bg-[#F5F5F7] text-[#1D1D1F]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-28">
        {/* Featured carousel */}
        {featured.length > 0 && !query && category === 'All' && (
          <div className="mt-6 mb-6">
            <h2 className="text-[22px] font-bold text-[#1D1D1F] mb-3">Featured deals</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {featured.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 w-72 bg-white border border-[#F5F5F7] rounded-card shadow-card overflow-hidden"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.title} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-[#FFE5E5] flex items-center justify-center">
                      <span className="text-4xl font-bold text-[#FF3B30]">
                        {formatVoucherValue(c.value_amount, c.value_type)}
                      </span>
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-[13px] text-[#86868B] mb-1">{c.merchants?.business_name}</p>
                    <p className="text-[22px] font-bold text-[#FF3B30] mb-3">
                      {formatVoucherValue(c.value_amount, c.value_type)}
                    </p>
                    <Button
                      size="sm"
                      fullWidth
                      disabled={claimed.has(c.id)}
                      loading={claiming === c.id}
                      onClick={() => handleClaim(c)}
                    >
                      {claimed.has(c.id) ? 'Claimed' : 'Claim'}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* All deals grid */}
        <div className="mt-6">
          <h2 className="text-[22px] font-bold text-[#1D1D1F] mb-3">
            {query ? `Results for "${query}"` : 'All vouchers'}
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <SkeletonList count={6}><CampaignCardSkeleton /></SkeletonList>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[22px] font-bold text-[#1D1D1F]">
                {query ? `No results for "${query}"` : 'No vouchers available'}
              </p>
              <p className="text-[17px] text-[#86868B] mt-2">
                {query ? 'Try a different search or browse by category' : 'Check back soon for new deals'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {campaigns.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.04 }}
                  className="bg-white border border-[#F5F5F7] rounded-card shadow-card overflow-hidden"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.title} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-[#FFE5E5] flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#FF3B30]">
                        {formatVoucherValue(c.value_amount, c.value_type)}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar src={c.merchants?.logo_url} name={c.merchants?.business_name} size={20} />
                      <p className="text-[12px] text-[#86868B] truncate">{c.merchants?.business_name}</p>
                    </div>
                    <p className="text-[18px] font-bold text-[#FF3B30] mb-1">
                      {formatVoucherValue(c.value_amount, c.value_type)}
                    </p>
                    <p className="text-[12px] text-[#86868B] mb-3 truncate">{c.title}</p>
                    <Button
                      size="sm"
                      fullWidth
                      disabled={claimed.has(c.id) || (c.max_total != null && c.total_issued >= c.max_total)}
                      loading={claiming === c.id}
                      onClick={() => handleClaim(c)}
                    >
                      {claimed.has(c.id) ? 'Claimed' : c.max_total != null && c.total_issued >= c.max_total ? 'Sold out' : 'Claim'}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
