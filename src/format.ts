/** One format for amounts, order IDs and times across every screen (es-CL). */
const currencies = new Map<string, Intl.NumberFormat>()

export function money(value: number, currency = 'CLP') {
  let format = currencies.get(currency)
  if (!format) {
    format = new Intl.NumberFormat('es-CL', { style: 'currency', currency })
    currencies.set(currency, format)
  }
  return format.format(value)
}

export const units = (value: number) => new Intl.NumberFormat('es-CL').format(value)

/** First 8 characters of a UUID, uppercase: the short ID printed on every receipt. */
export const shortId = (id: string) => id.slice(0, 8).toUpperCase()

export const time = (value: string | Date) => new Date(value).toLocaleTimeString('es-CL')

export const dateTime = (value: string | Date) =>
  new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

/** "hace 4 s", "hace 2 min": elapsed time between two instants, never negative. */
export function ago(from: Date, now: Date) {
  const seconds = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000))
  if (seconds < 60) return `hace ${seconds} s`
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `hace ${minutes} min` : `hace ${Math.floor(minutes / 60)} h`
}
