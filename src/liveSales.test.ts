import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from './api'
import { LIVE_SALES_INTERVAL_MS, LIVE_SALES_PATH, startPolling, totalsByCurrency } from './liveSales'

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
const flush = () => vi.advanceTimersByTimeAsync(0)

describe('live sales polling', () => {
  it('queries immediately and then every 3 s while the view is open', async () => {
    const load = vi.fn().mockResolvedValue({ productos: [] })
    const results: unknown[] = []
    const stop = startPolling(load, r => results.push(r))
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
    expect(LIVE_SALES_INTERVAL_MS).toBe(3000)
    await vi.advanceTimersByTimeAsync(2999)
    expect(load).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(load).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(6000)
    expect(load).toHaveBeenCalledTimes(4)
    stop()   // view closed
    await vi.advanceTimersByTimeAsync(30000)
    expect(load).toHaveBeenCalledTimes(4)
    expect(results).toHaveLength(4)
  })

  it('never overlaps requests: the next one is scheduled after the previous finished', async () => {
    let resolve: (value: unknown) => void = () => {}
    const load = vi.fn(() => new Promise(r => { resolve = r }))
    const stop = startPolling(load, () => {})
    await vi.advanceTimersByTimeAsync(10000)
    expect(load).toHaveBeenCalledTimes(1)   // still waiting for the slow response
    resolve({})
    await flush()
    await vi.advanceTimersByTimeAsync(3000)
    expect(load).toHaveBeenCalledTimes(2)
    stop()
  })

  it('keeps polling after a transient error but stops on 401/403', async () => {
    const transient = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue({})
    const results: { error?: unknown }[] = []
    const stopTransient = startPolling(transient, r => results.push(r as { error?: unknown }))
    await flush(); await vi.advanceTimersByTimeAsync(3000)
    expect(transient).toHaveBeenCalledTimes(2)
    expect(results[0].error).toBeInstanceOf(TypeError)
    stopTransient()

    for (const status of [401, 403]) {
      const denied = vi.fn().mockRejectedValue(new ApiError(status, 'denied'))
      startPolling(denied, () => {})
      await flush(); await vi.advanceTimersByTimeAsync(30000)
      expect(denied).toHaveBeenCalledTimes(1)
    }
  })

  it('requests the BFF route with the bearer through the central API client', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ productos: [], alertas: [] }) })
    vi.stubGlobal('fetch', fetcher)
    const api = createApi('https://api.example.invalid/api/v1', async () => 'test-token')
    const stop = startPolling(() => api(LIVE_SALES_PATH), () => {})
    await flush()
    expect(fetcher.mock.calls[0][0]).toBe('https://api.example.invalid/api/v1/ventas/en-vivo')
    expect(fetcher.mock.calls[0][1].method).toBe('GET')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
    stop()
  })

  it('totals are kept per currency', () => {
    const p = (moneda: string, importe: number, unidades: number) =>
      ({ productoId: moneda + importe, nombre: 'x', moneda, unidades, pedidos: 1, importe, version: 1, actualizadoEn: '2026-11-24T00:00:00Z' })
    expect(totalsByCurrency([p('CLP', 100, 1), p('USD', 5, 2), p('CLP', 50, 3)])).toEqual([
      { moneda: 'CLP', importe: 150, unidades: 4 }, { moneda: 'USD', importe: 5, unidades: 2 }])
  })
})
