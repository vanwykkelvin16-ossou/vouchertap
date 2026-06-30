import { useEffect, useState } from "react";

export function useCountdown(target: Date | string | null | undefined) {
  const targetMs = target ? new Date(target).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetMs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const diff = Math.max(0, targetMs - now);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { diff, expired: diff === 0, days, hours, minutes, seconds, totalSec };
}

export function formatCountdown(c: ReturnType<typeof useCountdown>): string {
  if (c.expired) return "Expired";
  if (c.days > 0) return `${c.days}d ${c.hours}h ${c.minutes}m`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m ${c.seconds}s`;
  return `${c.minutes}m ${c.seconds}s`;
}
