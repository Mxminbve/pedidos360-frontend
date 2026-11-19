import { ApiError, type LiveProduct, type LiveSales } from './api'

export const LIVE_SALES_PATH = '/ventas/en-vivo'
export const LIVE_SALES_INTERVAL_MS = 3000

export type PollResult<T> = { data: T; at: Date } | { error: unknown; at: Date }

/**
 * Queries immediately and then every `intervalMs` after the previous request finished (requests never
 * overlap). Stops when the returned function is called (view closed) or on 401/403, which a retry cannot fix.
 */
export function startPolling<T>(load: () => Promise<T>, onResult: (result: PollResult<T>) => void,
                                intervalMs = LIVE_SALES_INTERVAL_MS): () => void {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const tick = async () => {
    let fatal = false
    try {
      const data = await load()
      if (!stopped) onResult({ data, at: new Date() })
    } catch (error) {
      fatal = error instanceof ApiError && (error.status === 401 || error.status === 403)
      if (!stopped) onResult({ error, at: new Date() })
    }
    if (!stopped && !fatal) timer = setTimeout(tick, intervalMs)
  }
  void tick()
  return () => { stopped = true; if (timer !== undefined) clearTimeout(timer) }
}

export const REASONS: Record<string, string> = { ALTO_VALOR: 'Alto valor', MUCHAS_LINEAS: 'Más de 10 líneas' }

/** Day totals per currency (amounts in different currencies are never added together). */
export function totalsByCurrency(products: LiveProduct[]) {
  const totals = new Map<string, { moneda: string; importe: number; unidades: number }>()
  for (const product of products) {
    const total = totals.get(product.moneda) ?? { moneda: product.moneda, importe: 0, unidades: 0 }
    total.importe += product.importe
    total.unidades += product.unidades
    totals.set(product.moneda, total)
  }
  return [...totals.values()].sort((a, b) => a.moneda.localeCompare(b.moneda))
}

export function isEmpty(sales: LiveSales | undefined) { return !!sales && sales.productos.length === 0 && sales.alertas.length === 0 }
