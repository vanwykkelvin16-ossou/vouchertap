import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-[#FF3B30] text-white hover:bg-[#D70015] active:bg-[#D70015]',
  secondary: 'bg-white text-[#FF3B30] border border-[#FF3B30] hover:bg-[#FFE5E5]',
  tertiary:  'bg-transparent text-[#FF3B30]',
  danger:    'bg-[#FF3B30] text-white',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-btn',
  md: 'h-11 px-5 text-[15px] rounded-btn',
  lg: 'h-14 px-6 text-[17px] rounded-btn',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'lg', loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...(props as object)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {children}
        </span>
      ) : children}
    </motion.button>
  )
)
Button.displayName = 'Button'
