import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  title: z.string().min(3, 'Add a campaign title').max(80, 'Title must be under 80 characters'),
  description: z.string().optional(),
  value_type: z.enum(['discount', 'free_item', 'percentage']),
  value_amount: z.coerce.number().min(1, 'Enter the voucher value'),
  category: z.string().optional(),
  valid_from: z.string().min(1, 'Select a start date'),
  valid_until: z.string().min(1, 'Select an end date'),
  max_total: z.coerce.number().optional(),
  max_per_user: z.coerce.number().min(1).default(1),
  terms: z.string().optional(),
}).refine(d => new Date(d.valid_until) > new Date(d.valid_from), {
  message: 'End date must be after start date',
  path: ['valid_until'],
})

type FormData = z.infer<typeof schema>

const VALUE_TYPES = [
  { value: 'discount', label: 'Discount', hint: 'Fixed rand amount off' },
  { value: 'free_item', label: 'Free item', hint: 'Give something for free' },
  { value: 'percentage', label: 'Percentage off', hint: 'Percent discount' },
]

export function NewCampaignPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { value_type: 'discount', max_per_user: 1 },
  })

  const valueType = watch('value_type')

  useEffect(() => {
    if (!profile) return
    supabase.from('merchants').select('id').eq('owner_user_id', profile.id).single()
      .then(({ data }) => data && setMerchantId(data.id))
  }, [profile])

  async function onSubmit(data: FormData) {
    if (!merchantId) { toast.error('No merchant profile found'); return }
    setSaving(true)
    const { error } = await supabase.from('voucher_campaigns').insert({
      merchant_id: merchantId,
      title: data.title,
      description: data.description ?? null,
      value_type: data.value_type,
      value_amount: data.value_amount,
      category: data.category ?? null,
      valid_from: new Date(data.valid_from).toISOString(),
      valid_until: new Date(data.valid_until).toISOString(),
      max_total: data.max_total ?? null,
      max_per_user: data.max_per_user,
      terms: data.terms ?? null,
      is_active: true,
    })
    setSaving(false)
    if (error) { toast.error('Could not create campaign. Try again.'); return }
    toast.success('Campaign is live')
    navigate('/merchant/campaigns')
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white px-6 pt-14 pb-6 border-b border-[#F5F5F7] flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">New campaign</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 pb-32 flex flex-col gap-8 max-w-xl mx-auto">
        {/* Basics */}
        <section>
          <h2 className="text-[17px] font-semibold text-[#86868B] uppercase tracking-wider mb-4">Campaign details</h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Campaign title"
              placeholder="e.g. R100 off your next order"
              error={errors.title?.message}
              {...register('title')}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#1D1D1F]">Description</label>
              <textarea
                placeholder="Tell customers what they're getting"
                rows={3}
                className="bg-[#FAFAFA] rounded-btn px-4 py-3 text-[17px] text-[#1D1D1F] placeholder:text-[#86868B] border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30] resize-none"
                {...register('description')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#1D1D1F]">Category</label>
              <select
                className="bg-[#FAFAFA] rounded-btn px-4 py-3 text-[17px] text-[#1D1D1F] border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30] min-h-[44px]"
                {...register('category')}
              >
                <option value="">Select a category</option>
                {['Food', 'Retail', 'Services', 'Entertainment', 'Beauty'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Value */}
        <section>
          <h2 className="text-[17px] font-semibold text-[#86868B] uppercase tracking-wider mb-4">Voucher value</h2>
          <Controller
            name="value_type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {VALUE_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => field.onChange(t.value)}
                    className={`p-3 rounded-card border-2 text-left transition-all ${
                      field.value === t.value
                        ? 'border-[#FF3B30] bg-[#FFE5E5]'
                        : 'border-[#F5F5F7] bg-white'
                    }`}
                  >
                    <p className="text-[14px] font-semibold text-[#1D1D1F]">{t.label}</p>
                    <p className="text-[12px] text-[#86868B] mt-0.5">{t.hint}</p>
                  </button>
                ))}
              </div>
            )}
          />
          <Input
            label={valueType === 'percentage' ? 'Percentage off (%)' : valueType === 'free_item' ? 'Item description' : 'Discount amount (R)'}
            type={valueType === 'free_item' ? 'text' : 'number'}
            placeholder={valueType === 'percentage' ? '10' : valueType === 'free_item' ? 'e.g. Free medium coffee' : '100'}
            error={errors.value_amount?.message}
            {...register('value_amount')}
          />
        </section>

        {/* Validity */}
        <section>
          <h2 className="text-[17px] font-semibold text-[#86868B] uppercase tracking-wider mb-4">Validity period</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="date" error={errors.valid_from?.message} {...register('valid_from')} />
            <Input label="End date" type="date" error={errors.valid_until?.message} {...register('valid_until')} />
          </div>
        </section>

        {/* Limits */}
        <section>
          <h2 className="text-[17px] font-semibold text-[#86868B] uppercase tracking-wider mb-4">Claim limits</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total vouchers"
              type="number"
              placeholder="Unlimited"
              hint="Leave blank for unlimited"
              {...register('max_total')}
            />
            <Input
              label="Per customer"
              type="number"
              placeholder="1"
              defaultValue={1}
              {...register('max_per_user')}
            />
          </div>
        </section>

        {/* Terms */}
        <section>
          <h2 className="text-[17px] font-semibold text-[#86868B] uppercase tracking-wider mb-4">Terms & conditions</h2>
          <textarea
            placeholder="List any restrictions, exclusions, or conditions"
            rows={4}
            className="w-full bg-[#FAFAFA] rounded-btn px-4 py-3 text-[17px] text-[#1D1D1F] placeholder:text-[#86868B] border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30] resize-none"
            {...register('terms')}
          />
        </section>
      </form>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F5F7] p-4 pb-safe">
        <Button fullWidth loading={saving} onClick={handleSubmit(onSubmit)}>
          Launch campaign
        </Button>
      </div>
    </div>
  )
}
