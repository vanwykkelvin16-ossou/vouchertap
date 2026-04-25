import { useState, useEffect, useRef } from 'react'
import { DailyVerification } from '@/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function useVerification(pollInterval = 5000) {
  const [data, setData] = useState<DailyVerification | null>(null)
  const [serverTime, setServerTime] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchVerification() {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get_daily_verification`, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        }
      })
      if (!res.ok) throw new Error('Failed to fetch verification')
      const json: DailyVerification = await res.json()
      setData(json)
      setServerTime(new Date(json.current_server_time))
      setError(null)
    } catch (e) {
      setError('Could not reach verification server')
    }
  }

  useEffect(() => {
    fetchVerification()
    timerRef.current = setInterval(fetchVerification, pollInterval)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [pollInterval])

  useEffect(() => {
    if (!serverTime) return
    tickRef.current = setInterval(() => {
      setServerTime(prev => prev ? new Date(prev.getTime() + 1000) : null)
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [serverTime?.toISOString().split('T')[0]])

  return { data, serverTime, error }
}
