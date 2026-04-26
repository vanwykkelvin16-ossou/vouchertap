import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const loginSchema = z.object({
  email: z.string().email('Check your email — that doesn\'t look right'),
  password: z.string().min(1, 'Enter your password'),
})

const signupSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Check your email — that doesn\'t look right'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginForm = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>

export function AuthPage() {
  const { signIn, signUp, user, profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  if (user && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    if (profile.role === 'merchant') return <Navigate to="/merchant" replace />
    return <Navigate to="/" replace />
  }

  async function onLogin(data: LoginForm) {
    setLoading(true)
    const { error } = await signIn(data.email, data.password)
    setLoading(false)
    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        toast.error('Connection error. Check your internet and try again.')
      } else if (msg.includes('confirm') || msg.includes('verified')) {
        toast.error('Please confirm your email address first.')
      } else {
        toast.error('Incorrect email or password. Try again.')
      }
    }
    // Redirect handled by the user && profile render guard above
  }

  async function onSignup(data: SignupForm) {
    setLoading(true)
    const { error } = await signUp(data.email, data.password, data.fullName)
    setLoading(false)
    if (error) {
      if (error.message?.includes('already registered')) {
        toast.error('An account with this email already exists.')
      } else {
        toast.error('Something went wrong. Try again.')
      }
    } else {
      toast.success('Account created! Check your email to confirm.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#FF3B30] flex-col items-center justify-center p-12">
        <div className="text-white max-w-xs">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-[#FF3B30] font-black text-xl">VT</span>
            </div>
            <span className="text-white font-bold text-2xl">VoucherTap</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Smart vouchers.
            <br />
            Simple redemption.
          </h1>
          <p className="text-white/80 text-lg">
            Save more at the places you love.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-[#FAFAFA] flex flex-col items-center justify-center p-6 min-h-screen">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-[#FF3B30] rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-base">VT</span>
          </div>
          <span className="text-[#1D1D1F] font-bold text-xl">VoucherTap</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Tabs */}
          <div className="relative flex bg-[#F5F5F7] rounded-xl p-1 mb-8">
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 py-2.5 text-[15px] font-medium rounded-lg transition-colors z-10 ${
                  tab === t ? 'text-[#1D1D1F]' : 'text-[#86868B]'
                }`}
              >
                {tab === t && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{t === 'login' ? 'Sign in' : 'Sign up'}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="flex flex-col gap-4">
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    error={loginForm.formState.errors.email?.message}
                    {...loginForm.register('email')}
                  />
                  <div>
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Your password"
                      autoComplete="current-password"
                      error={loginForm.formState.errors.password?.message}
                      {...loginForm.register('password')}
                    />
                    <div className="mt-2 text-right">
                      <button type="button" className="text-[13px] text-[#FF3B30] font-medium">
                        Forgot password?
                      </button>
                    </div>
                  </div>
                  <Button type="submit" loading={loading} fullWidth className="mt-2">
                    Sign in
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="flex flex-col gap-4">
                  <Input
                    label="Full name"
                    type="text"
                    placeholder="Jane Smith"
                    autoComplete="name"
                    error={signupForm.formState.errors.fullName?.message}
                    {...signupForm.register('fullName')}
                  />
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    error={signupForm.formState.errors.email?.message}
                    {...signupForm.register('email')}
                  />
                  <Input
                    label="Create password"
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    hint="At least 8 characters"
                    error={signupForm.formState.errors.password?.message}
                    {...signupForm.register('password')}
                  />
                  <Button type="submit" loading={loading} fullWidth className="mt-2">
                    Create account
                  </Button>
                  <p className="text-center text-[13px] text-[#86868B]">
                    By creating an account, you agree to our{' '}
                    <span className="text-[#FF3B30]">Terms of Service</span> and{' '}
                    <span className="text-[#FF3B30]">Privacy Policy</span>
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
