import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[#1D1D1F]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-[#FAFAFA] rounded-btn px-4 py-3 text-[17px] text-[#1D1D1F] placeholder:text-[#86868B]',
              'border-0 outline-none focus:ring-[1.5px] focus:ring-[#FF3B30] transition-all min-h-[44px]',
              error && 'ring-[1.5px] ring-[#FF3B30] bg-[#FFE5E5]',
              icon ? 'pl-10' : '',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[13px] text-[#FF3B30]">{error}</p>}
        {hint && !error && <p className="text-[13px] text-[#86868B]">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
