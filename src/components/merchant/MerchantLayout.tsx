import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, ShieldCheck, User } from 'lucide-react'

const tabs = [
  { to: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/merchant/campaigns', label: 'Campaigns', icon: Tag },
  { to: '/merchant/verify', label: 'Verify', icon: ShieldCheck },
  { to: '/merchant/profile', label: 'Profile', icon: User },
]

export function MerchantLayout() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Outlet />
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F5F7] z-30 pb-safe">
        <div className="flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/merchant'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
                  isActive ? 'text-[#FF3B30]' : 'text-[#86868B]'
                }`
              }
            >
              <Icon size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
