import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, Merchant } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { DailyVerification } from '@/types'

interface Stats {
  users: number
  merchants: number
  campaigns: number
  redemptions: number
}

const RED_PALETTE = [
  { hex: '#FF3B30', name: 'VERMILLION' },
  { hex: '#DC143C', name: 'CRIMSON' },
  { hex: '#FF2400', name: 'SCARLET' },
  { hex: '#FF7F50', name: 'CORAL' },
  { hex: '#FF007F', name: 'ROSE' },
  { hex: '#DE3163', name: 'CHERRY' },
  { hex: '#C41E3A', name: 'CARDINAL' },
  { hex: '#E0115F', name: 'RUBY' },
  { hex: '#733635', name: 'GARNET' },
  { hex: '#CB4154', name: 'BRICK' },
  { hex: '#E34234', name: 'CINNABAR' },
  { hex: '#800000', name: 'MAROON' },
  { hex: '#960018', name: 'CARMINE' },
  { hex: '#800020', name: 'BURGUNDY' },
  { hex: '#FF6347', name: 'TOMATO' },
  { hex: '#E25822', name: 'FIRE' },
  { hex: '#660000', name: 'BLOOD' },
  { hex: '#EC5800', name: 'PERSIMMON' },
  { hex: '#FA8072', name: 'SALMON' },
  { hex: '#F94E5E', name: 'PUNCH' },
]

function getColorForDate(date: Date): { hex: string; name: string } {
  const dateStr = date.toISOString().split('T')[0]
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) & 0xffff
  }
  return RED_PALETTE[hash % RED_PALETTE.length]
}

export function AdminPage() {
  const [stats, setStats] = useState<Stats>({ users: 0, merchants: 0, campaigns: 0, redemptions: 0 })
  const [pendingMerchants, setPendingMerchants] = useState<Merchant[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'merchants' | 'users' | 'colors'>('overview')

  const colorPreview = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return { date: d, ...getColorForDate(d) }
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [usersRes, merchantsRes, campaignsRes, redemptionsRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('merchants').select('*', { count: 'exact', head: true }),
      supabase.from('voucher_campaigns').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('redemption_logs').select('*', { count: 'exact', head: true }),
      supabase.from('merchants').select('*').eq('is_verified', false).order('created_at', { ascending: false }),
    ])
    setStats({
      users: usersRes.count ?? 0,
      merchants: merchantsRes.count ?? 0,
      campaigns: campaignsRes.count ?? 0,
      redemptions: redemptionsRes.count ?? 0,
    })
    setPendingMerchants((pendingRes.data as Merchant[]) ?? [])

    const { data: u } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50)
    setUsers((u as Profile[]) ?? [])
    setLoading(false)
  }

  async function approveMerchant(id: string, name: string) {
    const { error } = await supabase.from('merchants').update({ is_verified: true }).eq('id', id)
    if (error) { toast.error('Could not approve'); return }
    setPendingMerchants(prev => prev.filter(m => m.id !== id))
    toast.success(`${name} verified`)
  }

  async function changeRole(userId: string, role: string) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) { toast.error('Could not update role'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as Profile['role'] } : u))
    toast.success('Role updated')
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'merchants', label: `Merchants (${pendingMerchants.length})` },
    { key: 'users', label: 'Users' },
    { key: 'colors', label: 'Colors' },
  ] as const

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white px-6 pt-14 pb-0 border-b border-[#F5F5F7] sticky top-0 z-20">
        <h1 className="text-[34px] font-bold text-[#1D1D1F] mb-4" style={{ letterSpacing: '-0.02em' }}>Admin</h1>
        <div className="flex gap-4 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-[15px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key ? 'text-[#1D1D1F] border-[#FF3B30]' : 'text-[#86868B] border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 pb-12">
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total users', value: stats.users },
              { label: 'Total merchants', value: stats.merchants },
              { label: 'Active campaigns', value: stats.campaigns },
              { label: 'Total redemptions', value: stats.redemptions },
            ].map(s => (
              <Card key={s.label} className="p-5">
                <p className="text-[28px] font-bold text-[#FF3B30]">{s.value}</p>
                <p className="text-[13px] text-[#86868B] mt-1">{s.label}</p>
              </Card>
            ))}
          </div>
        )}

        {tab === 'merchants' && (
          <div className="flex flex-col gap-3">
            {pendingMerchants.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-[17px] text-[#86868B]">No pending requests</p>
              </Card>
            ) : pendingMerchants.map(m => (
              <Card key={m.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={m.logo_url} name={m.business_name} size={44} />
                    <div>
                      <p className="text-[17px] font-semibold text-[#1D1D1F]">{m.business_name}</p>
                      <p className="text-[13px] text-[#86868B]">{m.category ?? 'Uncategorized'} · {m.city}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveMerchant(m.id, m.business_name)}>Approve</Button>
                    <Button size="sm" variant="secondary" onClick={() => {}}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="flex flex-col gap-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="bg-white border border-[#F5F5F7] rounded-xl px-4 py-3 text-[17px] text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:ring-[1.5px] focus:ring-[#FF3B30]"
            />
            <div className="flex flex-col gap-2">
              {filteredUsers.map(u => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatar_url} name={u.full_name} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1D1D1F] truncate">{u.full_name ?? 'No name'}</p>
                      <p className="text-[13px] text-[#86868B] truncate">{u.email}</p>
                    </div>
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="bg-[#F5F5F7] rounded-lg px-2 py-1 text-[13px] text-[#1D1D1F] border-0 outline-none"
                    >
                      <option value="customer">Customer</option>
                      <option value="merchant">Merchant</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab === 'colors' && (
          <div className="flex flex-col gap-4">
            <p className="text-[15px] text-[#86868B]">Next 7 days — share with merchants each Monday</p>
            {colorPreview.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-white border border-[#F5F5F7] rounded-card shadow-card"
              >
                <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: c.hex }} />
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#1D1D1F]">{c.name}</p>
                  <p className="text-[13px] text-[#86868B]">
                    {i === 0 ? 'Today' : c.date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="font-mono text-[13px] text-[#86868B]">{c.hex}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
