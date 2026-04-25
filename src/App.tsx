import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CustomerLayout } from '@/components/customer/CustomerLayout'
import { MerchantLayout } from '@/components/merchant/MerchantLayout'

import { AuthPage } from '@/pages/auth/AuthPage'
import { HomePage } from '@/pages/customer/HomePage'
import { BrowsePage } from '@/pages/customer/BrowsePage'
import { VoucherDetailPage } from '@/pages/customer/VoucherDetailPage'
import { RedemptionPage } from '@/pages/customer/RedemptionPage'
import { ProfilePage } from '@/pages/customer/ProfilePage'
import { MerchantDashboard } from '@/pages/merchant/MerchantDashboard'
import { VerifyPage } from '@/pages/merchant/VerifyPage'
import { CampaignsPage } from '@/pages/merchant/CampaignsPage'
import { NewCampaignPage } from '@/pages/merchant/NewCampaignPage'
import { MerchantProfilePage } from '@/pages/merchant/MerchantProfilePage'
import { AdminPage } from '@/pages/admin/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<AuthPage />} />

          {/* Customer */}
          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="/voucher/:id" element={<VoucherDetailPage />} />
            <Route path="/voucher/:id/redeemed" element={<RedemptionPage />} />
          </Route>

          {/* Merchant */}
          <Route element={<ProtectedRoute roles={['merchant']} />}>
            <Route element={<MerchantLayout />}>
              <Route path="/merchant" element={<MerchantDashboard />} />
              <Route path="/merchant/campaigns" element={<CampaignsPage />} />
              <Route path="/merchant/verify" element={<VerifyPage />} />
              <Route path="/merchant/profile" element={<MerchantProfilePage />} />
            </Route>
            <Route path="/merchant/campaigns/new" element={<NewCampaignPage />} />
            <Route path="/merchant/campaigns/:id" element={<CampaignsPage />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'white',
              borderLeft: '3px solid #FF3B30',
              borderRadius: '12px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif',
              fontSize: '15px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
