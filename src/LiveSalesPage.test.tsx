import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { LiveSales } from './api'
import { LiveSalesView } from './LiveSalesPage'

const render = (props: Parameters<typeof LiveSalesView>[0]) =>
  renderToStaticMarkup(<MemoryRouter><LiveSalesView {...props} /></MemoryRouter>)
const clp = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)

const sales: LiveSales = {
  fecha: '2026-11-24', generadoEn: '2026-11-24T14:05:15Z', ultimaActualizacion: '2026-11-24T14:05:13Z',
  productos: [
    { productoId: 'p1', nombre: 'Café de especialidad', moneda: 'CLP', unidades: 6, pedidos: 1, importe: 53940, version: 3, actualizadoEn: '2026-11-24T14:05:13Z' },
    { productoId: 'p2', nombre: 'Taza de cerámica', moneda: 'CLP', unidades: 1, pedidos: 1, importe: 12990, version: 1, actualizadoEn: '2026-11-24T14:05:13Z' },
  ],
  alertas: [{ pedidoId: 'a833930f-dd2d-4d43-a2b4-659c63a25bb4', motivos: ['ALTO_VALOR'], total: 66930, moneda: 'CLP', lineas: 2,
    ocurridoEn: '2026-11-24T14:05:12Z', detectadaEn: '2026-11-24T14:05:13Z' }],
}
const updatedAt = new Date('2026-11-24T14:05:15Z')

describe('Ventas en vivo view', () => {
  it('shows the day total per currency, per-product accumulators, alerts and how long ago it updated', () => {
    const html = render({ sales, updatedAt, now: new Date('2026-11-24T14:05:19Z') })
    expect(html).toContain('<h1>Ventas en vivo</h1>')
    expect(html).toContain('Día UTC <span class="mono">2026-11-24</span>')
    expect(html).toContain('Total del día · CLP')
    expect(html).toContain(clp(66930))   // 53.940 + 12.990, and the alert total
    expect(html).toContain('7 unidades')
    expect(html).toContain('Café de especialidad')
    expect(html).toContain('Taza de cerámica')
    expect(html).toContain('v3')
    expect(html).toContain('A833930F')
    expect(html).toContain('Alto valor')
    expect(html).toContain('el total alcanza el umbral de alto valor')
    expect(html).toContain('En vivo · actualizado hace 4 s')
    expect(html).toContain('role="status"')
  })

  it('renders products and alerts as tables with right-aligned tabular amounts', () => {
    const html = render({ sales, updatedAt, now: updatedAt })
    expect(html).toContain('class="ledger ledger-live"')
    expect(html).toContain('class="ledger ledger-alerts"')
    for (const column of ['Unidades', 'Pedidos', 'Importe', 'Versión', 'Actualizado']) {
      expect(html).toContain(`<th scope="col" class="num">${column}</th>`)
    }
    expect(html).toContain(`<td class="num amount" data-label="Importe">${clp(53940)}</td>`)
  })

  it('has loading, empty, reconnecting and error states', () => {
    expect(render({})).toContain('Consultando ventas en vivo…')
    const empty = render({ sales: { ...sales, productos: [], alertas: [], ultimaActualizacion: null }, updatedAt })
    expect(empty).toContain('Aún no hay pedidos en el día UTC 2026-11-24.')
    expect(empty).toContain('href="/nuevo"')
    expect(empty).not.toContain('Último evento')
    // 502 or timeout: keeps the last data and says it is reconnecting.
    const reconnecting = render({ sales, reconnecting: true, updatedAt, now: new Date('2026-11-24T14:05:27Z') })
    expect(reconnecting).toContain('Reconectando · último dato hace 12 s')
    expect(reconnecting).toContain('se muestran los últimos datos recibidos')
    expect(reconnecting).toContain('Café de especialidad')
    expect(reconnecting).not.toContain('role="alert"')
    // 401/403: polling stopped, the error is an alert; the last data is still shown.
    const failed = render({ sales, error: 'Tu cuenta no tiene permiso para esta operación.', updatedAt })
    expect(failed).toContain('role="alert"')
    expect(failed).toContain('Tu cuenta no tiene permiso para esta operación.')
    expect(failed).toContain('Detenido')
    expect(failed).toContain('Café de especialidad')
  })
})
