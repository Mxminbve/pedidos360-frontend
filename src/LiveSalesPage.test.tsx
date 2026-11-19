import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { LiveSales } from './api'
import { LiveSalesView } from './LiveSalesPage'

const render = (props: Parameters<typeof LiveSalesView>[0]) =>
  renderToStaticMarkup(<MemoryRouter><LiveSalesView {...props} /></MemoryRouter>)

const sales: LiveSales = {
  fecha: '2026-11-24', generadoEn: '2026-11-24T14:05:15Z', ultimaActualizacion: '2026-11-24T14:05:13Z',
  productos: [
    { productoId: 'p1', nombre: 'Café de especialidad', moneda: 'CLP', unidades: 6, pedidos: 1, importe: 53940, version: 3, actualizadoEn: '2026-11-24T14:05:13Z' },
    { productoId: 'p2', nombre: 'Taza de cerámica', moneda: 'CLP', unidades: 1, pedidos: 1, importe: 12990, version: 1, actualizadoEn: '2026-11-24T14:05:13Z' },
  ],
  alertas: [{ pedidoId: 'a833930f-dd2d-4d43-a2b4-659c63a25bb4', motivos: ['ALTO_VALOR'], total: 66930, moneda: 'CLP', lineas: 2,
    ocurridoEn: '2026-11-24T14:05:12Z', detectadaEn: '2026-11-24T14:05:13Z' }],
}

describe('Ventas en vivo view', () => {
  it('shows per-product accumulators, day totals per currency, alerts and the last update time', () => {
    const html = render({ sales, updatedAt: new Date('2026-11-24T14:05:15Z') })
    expect(html).toContain('<h1>Ventas en vivo</h1>')
    expect(html).toContain('Día UTC 2026-11-24')
    expect(html).toContain('Café de especialidad')
    expect(html).toContain('Taza de cerámica')
    expect(html).toContain('Versión 3')
    expect(html).toContain('TOTAL DEL DÍA / CLP')
    expect(html).toContain(new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(66930))
    expect(html).toContain('7 unidades')
    expect(html).toContain('PEDIDO / A833930F')
    expect(html).toContain('Alto valor')
    expect(html).toContain('Última actualización: ' + new Date('2026-11-24T14:05:15Z').toLocaleTimeString('es-CL'))
    expect(html).toContain('role="status"')
  })

  it('reuses the existing visual classes (no new design)', () => {
    const html = render({ sales, updatedAt: new Date() })
    for (const css of ['page page-orders', 'section-title', 'section-rule', 'order-list', 'order-header', 'order-total', 'badge badge-success']) {
      expect(html).toContain(`class="${css}"`)
    }
  })

  it('has loading, empty and error states', () => {
    expect(render({})).toContain('Consultando ventas en vivo…')
    const empty = render({ sales: { ...sales, productos: [], alertas: [], ultimaActualizacion: null }, updatedAt: new Date() })
    expect(empty).toContain('Aún no hay pedidos en el día UTC')
    expect(empty).not.toContain('último evento procesado')
    const failed = render({ sales, error: 'Tu cuenta no tiene permiso para esta operación.' })
    expect(failed).toContain('role="alert"')
    expect(failed).toContain('Tu cuenta no tiene permiso para esta operación.')
    expect(failed).toContain('Café de especialidad')   // last data kept on error
  })
})
