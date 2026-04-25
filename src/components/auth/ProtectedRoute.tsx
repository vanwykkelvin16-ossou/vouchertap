import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'

interface ProtectedRouteProps {
  roles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({ roles, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#FF3B30] rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">VT</span>
          </div>
          <div className="w-6 h-6 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to={redirectTo} replace />
  if (roles && profile && !roles.includes(profile.role)) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    if (profile.role === 'merchant') return <Navigate to="/merchant" replace />
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
