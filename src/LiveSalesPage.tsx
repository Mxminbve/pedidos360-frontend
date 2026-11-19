import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { createApi, LiveSales } from './api'
import { isEmpty, LIVE_SALES_INTERVAL_MS, LIVE_SALES_PATH, REASONS, startPolling, totalsByCurrency } from './liveSales'

const money = (value: number, currency: string) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(value)
const time = (value: string | Date) => new Date(value).toLocaleTimeString('es-CL')
const message = (error: unknown) => error instanceof Error ? error.message : 'No fue posible consultar las ventas en vivo.'

/** Presentation only (no effects): reuses the existing visual classes of the orders pages. */
export function LiveSalesView({ sales, error, updatedAt }: { sales?: LiveSales; error?: string; updatedAt?: Date }) {
  return <section className="page page-orders">
    <div className="section-title">
      <div className="section-heading">
        <p className="eyebrow"><span>05</span> EN CUASI TIEMPO REAL</p>
        <h1>Ventas en vivo</h1>
        <p className="section-lead">Acumulados del día por producto y moneda, y pedidos que requieren atención.</p>
      </div>
      <Link className="button button-primary" to="/nuevo">
        <span>Nuevo pedido</span>
        <span className="button-arrow" aria-hidden="true">＋</span>
      </Link>
    </div>

    <div className="section-rule">
      <p className="muted">
        Día UTC {sales?.fecha ?? '—'} · Se actualiza cada {LIVE_SALES_INTERVAL_MS / 1000} s mientras esta vista está abierta.
        Importes solicitados; no representan pagos.
      </p>
      <span className="rule-label">PEDIDOS360 / STREAMING</span>
    </div>

    {error && <p role="alert" className="error"><span className="error-mark" aria-hidden="true">!</span><span>{error}</span></p>}
    {updatedAt && <p role="status" className="config-status">
      Última actualización: {time(updatedAt)}
      {sales?.ultimaActualizacion ? ` · último evento procesado: ${time(sales.ultimaActualizacion)}` : ''}
    </p>}
    {!sales && !error && <p role="status" className="loading-state"><span className="loading-dot" />Consultando ventas en vivo…</p>}

    {isEmpty(sales) && <div className="empty">
      <div className="empty-visual" aria-hidden="true"><span>~</span></div>
      <div>
        <p className="eyebrow">SIN VENTAS HOY</p>
        <h2>Aún no hay pedidos en el día UTC</h2>
        <p>Los pedidos nuevos aparecen aquí pocos segundos después de registrarse.</p>
        <Link to="/catalogo">Ver catálogo <span aria-hidden="true">→</span></Link>
      </div>
    </div>}

    {sales && sales.productos.length > 0 && <div className="order-list">
      {totalsByCurrency(sales.productos).map(total => <article className="order" key={'total-' + total.moneda}>
        <div className="order-accent" aria-hidden="true" />
        <div className="order-header">
          <div><small className="order-code">TOTAL DEL DÍA / {total.moneda}</small><h2>{money(total.importe, total.moneda)}</h2></div>
          <span className="badge badge-success"><i aria-hidden="true" />{total.unidades} unidades</span>
        </div>
      </article>)}
      {sales.productos.map(product => <article className="order" key={product.productoId + product.moneda}>
        <div className="order-accent" aria-hidden="true" />
        <div className="order-header">
          <div><small className="order-code">PRODUCTO / {product.moneda}</small><h2>{product.nombre}</h2></div>
          <span className="badge badge-muted"><i aria-hidden="true" />Versión {product.version}</span>
        </div>
        <div className="order-body">
          <p className="order-label">Acumulado del día</p>
          <ul>
            <li><span>Unidades vendidas</span><strong>{product.unidades}</strong></li>
            <li><span>Pedidos que lo incluyen</span><strong>{product.pedidos}</strong></li>
          </ul>
        </div>
        <div className="order-total">
          <span><small>Importe solicitado</small><span>Actualizado {time(product.actualizadoEn)}</span></span>
          <strong>{money(product.importe, product.moneda)}</strong>
        </div>
      </article>)}
    </div>}

    {sales && sales.alertas.length > 0 && <>
      <div className="section-rule">
        <p className="muted">Alertas recientes: pedidos de alto valor o con más de diez líneas.</p>
        <span className="rule-label">ALERTAS / {sales.alertas.length}</span>
      </div>
      <div className="order-list">
        {sales.alertas.map(alert => <article className="order" key={alert.pedidoId}>
          <div className="order-accent" aria-hidden="true" />
          <div className="order-header">
            <div><small className="order-code">PEDIDO / {alert.pedidoId.slice(0, 8).toUpperCase()}</small><h2>{time(alert.ocurridoEn)}</h2></div>
            <span className="badge badge-success"><i aria-hidden="true" />{alert.motivos.map(m => REASONS[m] ?? m).join(' · ')}</span>
          </div>
          <div className="order-total">
            <span><small>Total del pedido</small><span>{alert.lineas} {alert.lineas === 1 ? 'línea' : 'líneas'}</span></span>
            <strong>{money(alert.total, alert.moneda)}</strong>
          </div>
        </article>)}
      </div>
    </>}
  </section>
}

/** Protected view: polls GET /ventas/en-vivo every 3 s while mounted; keeps the last data on transient errors. */
export function LiveSalesPage({ api }: { api: ReturnType<typeof createApi> }) {
  const [sales, setSales] = useState<LiveSales>()
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date>()
  useEffect(() => startPolling(() => api<LiveSales>(LIVE_SALES_PATH), result => {
    if ('data' in result) { setSales(result.data); setError(''); setUpdatedAt(result.at) }
    else setError(message(result.error))
  }), [api])
  return <LiveSalesView sales={sales} error={error} updatedAt={updatedAt} />
}
