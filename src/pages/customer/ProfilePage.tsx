import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, User, Bell, HelpCircle, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ claimed: 0, redeemed: 0, saved: 0 })
  const [editOpen, setEditOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    async function loadStats() {
      const { data: all } = await supabase
        .from('vouchers')
        .select('status, voucher_campaigns(value_amount, value_type)')
        .eq('user_id', profile!.id)

      if (!all) return
      const claimed = all.length
      const redeemed = all.filter(v => v.status === 'redeemed').length
      const saved = all
        .filter(v => v.status === 'redeemed')
        .reduce((sum, v) => {
          const vc = (v.voucher_campaigns as unknown) as { value_amount: number; value_type: string } | null | undefined
          if (vc && !Array.isArray(vc) && vc.value_type === 'discount') return sum + (vc.value_amount ?? 0)
          return sum
        }, 0)
      setStats({ claimed, redeemed, saved })
    }
    loadStats()
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
  }, [profile])

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', profile.id)
    setSaving(false)
    if (error) { toast.error('Could not save. Try again.'); return }
    await refreshProfile()
    setEditOpen(false)
    toast.success('Profile updated')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const settingsRows = [
    { icon: User, label: 'Edit profile', onClick: () => setEditOpen(true) },
    { icon: Bell, label: 'Notifications', onClick: () => {} },
    { icon: HelpCircle, label: 'Help & support', onClick: () => {} },
    { icon: LogOut, label: 'Sign out', onClick: () => setSignOutOpen(true), danger: true },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-6">
        <div className="flex items-center gap-4">
          <Avatar src={profile?.avatar_url} name={profile?.full_name} size={64} />
          <div>
            <h2 className="text-[22px] font-bold text-[#1D1D1F]">{profile?.full_name ?? 'Your Name'}</h2>
            <p className="text-[15px] text-[#86868B]">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 bg-white border border-[#F5F5F7] rounded-card shadow-card p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Claimed', value: stats.claimed },
            { label: 'Redeemed', value: stats.redeemed },
            { label: 'Saved', value: `R${stats.saved}` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[28px] font-bold text-[#FF3B30]">{s.value}</p>
              <p className="text-[13px] text-[#86868B] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="mx-4 mt-4 bg-white border border-[#F5F5F7] rounded-card shadow-card overflow-hidden">
        {settingsRows.map((row, i) => (
          <button
            key={row.label}
            onClick={row.onClick}
            className={`w-full flex items-center gap-4 px-6 py-4 min-h-[56px] transition-colors hover:bg-[#FAFAFA] ${
              i < settingsRows.length - 1 ? 'border-b border-[#F5F5F7]' : ''
            }`}
          >
            <row.icon size={20} className={row.danger ? 'text-[#FF3B30]' : 'text-[#86868B]'} />
            <span className={`flex-1 text-[17px] text-left ${row.danger ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'}`}>
              {row.label}
            </span>
            {!row.danger && <ChevronRight size={18} className="text-[#86868B]" />}
          </button>
        ))}
      </div>

      {/* Edit profile modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="flex flex-col gap-4">
          <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <Input label="Phone number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <Button fullWidth loading={saving} onClick={saveProfile} className="mt-2">
            Save changes
          </Button>
        </div>
      </Modal>

      {/* Sign out confirm */}
      <Modal open={signOutOpen} onClose={() => setSignOutOpen(false)}>
        <div className="text-center pb-2">
          <h2 className="text-[24px] font-bold text-[#1D1D1F] mb-2">Sign out?</h2>
          <p className="text-[17px] text-[#86868B] mb-6">
            You'll need to sign back in to access your vouchers.
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="danger" fullWidth onClick={handleSignOut}>Sign out</Button>
            <button
              onClick={() => setSignOutOpen(false)}
              className="text-[17px] text-[#86868B] py-3 min-h-[44px]"
            >
              Stay signed in
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
