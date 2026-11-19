import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Acquisition, AuthClient } from './auth'
import { ApiError, type Identity, type Order, type createApi } from './api'
import { Loading, PageHead, Problem } from './ui'

export function SessionPage({ auth, api }: { auth: AuthClient; api: ReturnType<typeof createApi> }) {
  const [identity, setIdentity] = useState<Identity>()
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    api<Identity>('/me').then(value => {
      if (active) { setIdentity(value); setAcquisition(auth.lastAcquisition()) }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'No fue posible consultar la sesión.') })
    return () => { active = false }
  }, [api, auth])
  async function refresh() {
    setBusy(true); setError(''); setStatus('')
    try {
      await auth.token(true)
      const acquired = auth.lastAcquisition()
      setIdentity(await api<Identity>('/me'))
      setAcquisition(acquired)
      setStatus('Renovación solicitada a Microsoft; la API aceptó el token. No es una prueba de expiración natural.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible renovar la sesión.') }
    finally { setBusy(false) }
  }
  async function checkAdmin() {
    setBusy(true); setError(''); setStatus('')
    try {
      const orders = await api<Order[]>('/admin/pedidos')
      setStatus(`Consulta Admin: HTTP 200. ${orders.length} pedidos en el tenant.`)
    } catch (reason) {
      if (reason instanceof ApiError) setStatus(`Consulta Admin: HTTP ${reason.status}. ${reason.message}`)
      else setError(reason instanceof Error ? reason.message : 'No fue posible verificar el acceso.')
    } finally { setBusy(false) }
  }
  const rows: [string, string, boolean?][] = identity ? [
    ['Permisos de la API', identity.scopes.join(' · ')],
    ['Tenant', identity.tenantId, true],
    ['Identidad del propietario', identity.subjectId, true],
    ['Subject del token', identity.tokenSubject ?? 'No informado', true],
    ['API destinataria (audience)', identity.audience.join(', '), true],
    ['Cliente autorizado', identity.clientId, true],
    ['Emisor', identity.issuer, true],
    ['Versión de token', identity.tokenVersion, true],
    ['Emitido', identity.issuedAt ? new Date(identity.issuedAt).toLocaleString('es-CL') : 'No informado', true],
    ['Válido hasta', new Date(identity.expiresAt).toLocaleString('es-CL'), true],
  ] : []
  return <section className="page">
    <PageHead title="Mi sesión" lead="Identidad y permisos que la API validó en tu token." />
    <Problem message={error} />
    {status && <p role="status" className="notice notice-info">{status}</p>}
    {!identity && !error && <Loading>Consultando sesión…</Loading>}
    {identity && <article className="sheet session">
      <header className="sheet-head">
        <div>
          <p className="meta">{auth.mode === 'entra' ? 'Microsoft Entra ID' : 'Demostración local'}</p>
          <h2>{identity.name ?? auth.user()}</h2>
          {identity.username && <p className="sub">{identity.username}</p>}
        </div>
        <span className="tag tag-ok">{identity.roles.join(' · ') || 'Sin rol asignado'}</span>
      </header>
      <dl className="facts">
        {rows.map(([label, value, mono]) => <div key={label}><dt>{label}</dt><dd className={mono ? 'mono' : undefined}>{value}</dd></div>)}
        {acquisition && <div><dt>Última adquisición</dt><dd>{acquisition.requestedRefresh ? 'Renovación solicitada' : 'Adquisición silenciosa'} · {acquisition.fromCache ? 'desde caché MSAL' : 'desde Microsoft'}</dd></div>}
      </dl>
      <div className="actions">
        {auth.mode === 'entra' && <button className="button button-primary" disabled={busy} onClick={refresh}>Renovar sesión</button>}
        <button className="button" disabled={busy} onClick={checkAdmin}>Comprobar acceso Admin</button>
        {identity.roles.includes('Admin') && <Link className="button" to="/administracion">Pedidos del tenant</Link>}
        {auth.mode === 'entra' && <button className="button" disabled={busy} onClick={() => { void auth.login().catch(reason => setError(reason instanceof Error ? reason.message : 'No fue posible cambiar de cuenta.')) }}>Cambiar cuenta</button>}
      </div>
    </article>}
  </section>
}
