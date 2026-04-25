import { format, formatDistanceToNow, differenceInDays, isPast } from 'date-fns'
import { ValueType } from '@/types'

export function formatVoucherValue(amount: number, type: ValueType, item?: string | null): string {
  if (type === 'discount') return `R${amount} OFF`
  if (type === 'percentage') return `${amount}% OFF`
  if (type === 'free_item') return `FREE ${item ?? 'Item'}`
  return `R${amount}`
}

export function formatDate(date: string): string {
  return format(new Date(date), 'd MMM yyyy')
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm:ss')
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function daysUntil(date: string): number {
  return differenceInDays(new Date(date), new Date())
}

export function isExpired(date: string): boolean {
  return isPast(new Date(date))
}

export function expiryLabel(date: string): string {
  const days = daysUntil(date)
  if (days < 0) return 'Expired'
  if (days === 0) return 'Expires today'
  if (days <= 7) return `Expires in ${days} day${days === 1 ? '' : 's'}`
  return `Valid until ${formatDate(date)}`
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
