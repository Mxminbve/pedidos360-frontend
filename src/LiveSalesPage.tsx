import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { createApi, LiveSales } from './api'
import { ago, money, shortId, time, units } from './format'
import { isEmpty, isFatal, LIVE_SALES_INTERVAL_MS, LIVE_SALES_PATH, REASONS, startPolling, totalsByCurrency } from './liveSales'
import { Empty, Loading, PageHead, Problem } from './ui'

const REASON_DETAIL: Record<string, string> = {
  ALTO_VALOR: 'el total alcanza el umbral de alto valor',
  MUCHAS_LINEAS: 'el pedido tiene más de diez líneas',
}
const message = (error: unknown) => error instanceof Error ? error.message : 'No fue posible consultar las ventas en vivo.'

type Props = { sales?: LiveSales; error?: string; reconnecting?: boolean; updatedAt?: Date; now?: Date }

/** Presentation only (no effects): an operations board fed by GET /ventas/en-vivo. */
export function LiveSalesView({ sales, error, reconnecting = false, updatedAt, now = new Date() }: Props) {
  const seconds = LIVE_SALES_INTERVAL_MS / 1000
  const state = error ? 'stopped' : reconnecting ? 'reconnecting' : updatedAt ? 'live' : 'connecting'
  const stateText = {
    stopped: 'Detenido',
    reconnecting: 'Reconectando' + (updatedAt ? ` · último dato ${ago(updatedAt, now)}` : ''),
    live: `En vivo · actualizado ${updatedAt ? ago(updatedAt, now) : ''}`,
    connecting: 'Conectando',
  }[state]
  const totals = sales ? totalsByCurrency(sales.productos) : []

  return <section className="page">
    <PageHead title="Ventas en vivo" lead="Acumulados del día por producto y alertas, calculados desde Kafka."
      action={<Link className="button" to="/nuevo">Nuevo pedido</Link>} />

    <div className="live-bar">
      <span role="status" className={'live-state live-' + state}><i className="live-dot" aria-hidden="true" />{stateText}</span>
      <span className="meta">Día UTC <span className="mono">{sales?.fecha ?? '—'}</span></span>
      <span className="meta">Consulta cada {seconds} s</span>
      {sales?.ultimaActualizacion && <span className="meta">Último evento <span className="mono">{time(sales.ultimaActualizacion)}</span></span>}
    </div>

    {reconnecting && <div className="notice notice-warn" role="status">
      <p>El servicio de ventas no responde. Se reintenta cada {seconds} s{sales ? '; se muestran los últimos datos recibidos.' : '.'}</p>
    </div>}
    <Problem message={error ?? ''} />
    {!sales && !error && !reconnecting && <Loading>Consultando ventas en vivo…</Loading>}

    {isEmpty(sales) && <Empty title={`Aún no hay pedidos en el día UTC ${sales!.fecha}.`}
      action={<Link className="button button-primary" to="/nuevo">Registrar un pedido</Link>}>
      Los pedidos nuevos aparecen aquí unos segundos después de registrarse.
    </Empty>}

    {sales && sales.productos.length > 0 && <>
      <div className="kpis">
        {totals.map(total => <div className="kpi" key={total.moneda}>
          <span className="kpi-label">Total del día · {total.moneda}</span>
          <strong className="kpi-value amount">{money(total.importe, total.moneda)}</strong>
          <span className="kpi-sub">{units(total.unidades)} unidades</span>
        </div>)}
        <div className="kpi">
          <span className="kpi-label">Productos con ventas</span>
          <strong className="kpi-value amount">{sales.productos.length}</strong>
          <span className="kpi-sub">en el día UTC</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Alertas recientes</span>
          <strong className="kpi-value amount">{sales.alertas.length}</strong>
          <span className="kpi-sub">alto valor o más de diez líneas</span>
        </div>
      </div>

      <h2 className="section-heading">Por producto</h2>
      <table className="ledger ledger-live">
        <thead><tr>
          <th scope="col">Producto</th><th scope="col" className="num">Unidades</th><th scope="col" className="num">Pedidos</th>
          <th scope="col" className="num">Importe</th><th scope="col" className="num">Versión</th><th scope="col" className="num">Actualizado</th>
        </tr></thead>
        <tbody>
          {sales.productos.map(product => <tr key={product.productoId + product.moneda}>
            <th scope="row" className="cell-title">{product.nombre}<span className="sub">{product.moneda}</span></th>
            <td className="num" data-label="Unidades">{units(product.unidades)}</td>
            <td className="num" data-label="Pedidos">{units(product.pedidos)}</td>
            <td className="num amount" data-label="Importe">{money(product.importe, product.moneda)}</td>
            <td className="num mono" data-label="Versión">v{product.version}</td>
            <td className="num mono" data-label="Actualizado">{time(product.actualizadoEn)}</td>
          </tr>)}
        </tbody>
      </table>
    </>}

    {sales && sales.alertas.length > 0 && <>
      <h2 className="section-heading">Alertas</h2>
      <table className="ledger ledger-alerts">
        <thead><tr>
          <th scope="col">Hora</th><th scope="col">Pedido</th><th scope="col">Motivo</th>
          <th scope="col" className="num">Líneas</th><th scope="col" className="num">Total</th>
        </tr></thead>
        <tbody>
          {sales.alertas.map(alert => <tr key={alert.pedidoId}>
            <td className="mono" data-label="Hora">{time(alert.ocurridoEn)}</td>
            <th scope="row" className="mono" data-label="Pedido">{shortId(alert.pedidoId)}</th>
            <td data-label="Motivo">{alert.motivos.map(reason => <span className="reason" key={reason}>
              <span className="tag tag-alert">{REASONS[reason] ?? reason}</span> {REASON_DETAIL[reason] ?? ''}
            </span>)}</td>
            <td className="num" data-label="Líneas">{alert.lineas}</td>
            <td className="num amount" data-label="Total">{money(alert.total, alert.moneda)}</td>
          </tr>)}
        </tbody>
      </table>
    </>}

    {sales && !isEmpty(sales) && <p className="footnote">
      Importes solicitados; no representan pagos. Las alertas se guardan en memoria del servicio y se reinician con él.
    </p>}
  </section>
}

/** Protected view: polls GET /ventas/en-vivo every 3 s while mounted; keeps the last data while reconnecting. */
export function LiveSalesPage({ api }: { api: ReturnType<typeof createApi> }) {
  const [sales, setSales] = useState<LiveSales>()
  const [error, setError] = useState('')
  const [reconnecting, setReconnecting] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date>()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => startPolling(() => api<LiveSales>(LIVE_SALES_PATH), result => {
    if ('data' in result) { setSales(result.data); setError(''); setReconnecting(false); setUpdatedAt(result.at) }
    else if (isFatal(result.error)) { setError(message(result.error)); setReconnecting(false) }
    else setReconnecting(true)
  }), [api])
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])
  return <LiveSalesView sales={sales} error={error} reconnecting={reconnecting} updatedAt={updatedAt} now={now} />
}
