const IST_ZONE = 'Asia/Kolkata'
const EST_ZONE = 'America/New_York'

const toDate = (value: string | Date) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (!value) return null
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatInZone = (value: string | Date, zone: string) => {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: zone,
  }).format(date)
}

export const formatIST = (value: string | Date) => {
  const formatted = formatInZone(value, IST_ZONE)
  return formatted === '—' ? formatted : `${formatted} IST`
}

export const formatEST = (value: string | Date) => {
  const formatted = formatInZone(value, EST_ZONE)
  return formatted === '—' ? formatted : `${formatted} EST`
}

export const formatDualTimezone = (value: string | Date) => {
  const ist = formatIST(value)
  const est = formatEST(value)
  if (ist === '—' || est === '—') return '—'
  return `${ist} / ${est}`
}

