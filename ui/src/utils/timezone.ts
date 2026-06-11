const IST_ZONE = 'Asia/Kolkata'
const EASTERN_ZONE = 'America/New_York'

export const parseISTDateTime = (dateValue?: string, timeValue?: string) => {
  if (!dateValue || !timeValue) return null
  const normalizedDate = String(dateValue).trim()
  const normalizedTime = String(timeValue).trim()
  const timePart = normalizedTime.includes(' ') ? normalizedTime.split(' ').pop() || '' : normalizedTime
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedDate)
  if (!match) return null
  const [h, m, s = '00'] = timePart.slice(0, 8).split(':')
  if (!h || !m) return null
  const utcMillis = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(h) - 5, Number(m) - 30, Number(s))
  const asDate = new Date(utcMillis)
  return Number.isNaN(asDate.getTime()) ? null : asDate
}

const toDate = (value: string | Date) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (!value) return null
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatInZone = (value: string | Date, zone: string, options: Intl.DateTimeFormatOptions = {}) => {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: zone,
    ...options,
  }).format(date)
}

export const formatIST = (value: string | Date) => {
  const formatted = formatInZone(value, IST_ZONE)
  return formatted === '—' ? formatted : `${formatted} IST`
}

export const formatEastern = (value: string | Date) => formatInZone(value, EASTERN_ZONE, { timeZoneName: 'short' })


export const formatDualTimezone = (value: string | Date) => {
  const ist = formatIST(value)
  const eastern = formatEastern(value)
  if (ist === '—' || eastern === '—') return '—'
  return `${ist} / ${eastern}`
}
