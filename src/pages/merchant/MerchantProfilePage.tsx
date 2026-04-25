import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Merchant } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Food', 'Retail', 'Services', 'Entertainment', 'Beauty']

export function MerchantProfilePage() {
  const { profile } = useAuth()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    business_name: '', description: '', address: '', city: '', category: ''
  })

  useEffect(() => {
    if (!profile) return
    supabase.from('merchants').select('*').eq('owner_user_id', profile.id).single()
      .then(({ data }) => {
        if (data) {
          const m = data as Merchant
          setMerchant(m)
          setForm({
            business_name: m.business_name ?? '',
            description: m.description ?? '',
            address: m.address ?? '',
            city: m.city ?? '',
            category: m.category ?? '',
          })
        }
        setLoading(false)
      })
  }, [profile])

  async function save() {
    if (!merchant) return
    setSaving(true)
    const { error } = await supabase.from('merchants').update(form).eq('id', merchant.id)
    setSaving(false)
    if (error) { toast.error('Could not save. Try again.'); return }
    toast.success('Profile updated')
    setMerchant({ ...merchant, ...form })
  }

  async function createMerchant() {
    if (!profile) return
    setSaving(true)
    const { data, error } = await supabase.from('merchants').insert({
      ...form,
      owner_user_id: profile.id,
    }).select().single()
    setSaving(false)
    if (error) { toast.error('Could not create merchant profile.'); return }
    setMerchant(data as Merchant)
    toast.success('Merchant profile created')
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
  </div>

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white px-6 pt-14 pb-6 border-b border-[#F5F5F7]">
        <div className="flex items-center justify-between">
          <h1 className="text-[34px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
            Business profile
          </h1>
          {merchant?.is_verified && (
            <div className="flex items-center gap-1.5">
              <CheckCircle size={18} className="text-[#34C759]" />
              <span className="text-[13px] font-medium text-[#34C759]">Verified</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-6 pb-32 max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Input
            label="Business name"
            value={form.business_name}
            onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
            placeholder="Your business name"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#1D1D1F]">About your business</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Tell customers about your business"
              rows={3}
              className="bg-[#FAFAFA] rounded-btn px-4 py-3 text-[17px] text-[#1D1D1F] placeholder:text-[#86868B] border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30] resize-none"
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            placeholder="Street address"
          />
          <Input
            label="City"
            value={form.city}
            onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
            placeholder="City"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#1D1D1F]">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="bg-[#FAFAFA] rounded-btn px-4 py-3 text-[17px] text-[#1D1D1F] border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30] min-h-[44px]"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {!merchant?.is_verified && merchant && (
          <div className="bg-[#F5F5F7] rounded-card p-4">
            <p className="text-[15px] font-medium text-[#1D1D1F] mb-1">Get verified</p>
            <p className="text-[13px] text-[#86868B] mb-3">
              Our team reviews requests within 1–2 business days.
            </p>
            <Badge variant="grey">Verification pending</Badge>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F5F7] p-4 pb-safe">
        <Button fullWidth loading={saving} onClick={merchant ? save : createMerchant}>
          {merchant ? 'Save changes' : 'Create merchant profile'}
        </Button>
      </div>
    </div>
  )
}
