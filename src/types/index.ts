export type UserRole = 'customer' | 'merchant' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface Merchant {
  id: string
  business_name: string
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  address: string | null
  city: string | null
  category: string | null
  owner_user_id: string
  is_verified: boolean
  created_at: string
}

export type ValueType = 'discount' | 'free_item' | 'percentage'

export interface VoucherCampaign {
  id: string
  merchant_id: string
  title: string
  description: string | null
  terms: string | null
  image_url: string | null
  value_amount: number
  value_type: ValueType
  category: string | null
  valid_from: string
  valid_until: string
  total_issued: number
  max_total: number | null
  max_per_user: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  merchants?: Merchant
}

export type VoucherStatus = 'active' | 'redeemed' | 'expired' | 'revoked'

export interface Voucher {
  id: string
  campaign_id: string
  user_id: string
  voucher_code: string
  status: VoucherStatus
  issued_at: string
  redeemed_at: string | null
  redeemed_by_merchant_id: string | null
  expires_at: string
  voucher_campaigns?: VoucherCampaign
}

export interface RedemptionLog {
  id: string
  voucher_id: string
  redeemed_at: string
  merchant_user_id: string | null
  ip_address: string | null
  device_info: string | null
  vouchers?: Voucher & { voucher_campaigns?: VoucherCampaign }
  profiles?: Profile
}

export interface DailyVerification {
  current_server_time: string
  todays_color_hex: string
  todays_color_name: string
}
