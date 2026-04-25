import { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body?: string
  action?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, body, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && <div className="text-[#86868B] mb-4">{icon}</div>}
      <h3 className="text-[22px] font-bold text-[#1D1D1F] mb-2">{title}</h3>
      {body && <p className="text-[17px] text-[#86868B] mb-6 max-w-xs">{body}</p>}
      {action && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>{action}</Button>
      )}
    </div>
  )
}
