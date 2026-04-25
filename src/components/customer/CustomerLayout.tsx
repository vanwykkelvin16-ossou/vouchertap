import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/ui/BottomNav'

export function CustomerLayout() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Outlet />
      <BottomNav />
    </div>
  )
}
