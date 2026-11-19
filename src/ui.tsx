import type { ReactNode } from 'react'

/** Page heading: title, one concrete sentence and an optional action, aligned to the content column. */
export function PageHead({ title, lead, action }: { title: string; lead?: ReactNode; action?: ReactNode }) {
  return <header className="page-head">
    <div>
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
    </div>
    {action && <div className="page-action">{action}</div>}
  </header>
}

export function Loading({ children }: { children: ReactNode }) {
  return <p role="status" className="loading"><span className="loading-bar" aria-hidden="true" />{children}</p>
}

/** Error with an optional retry action. */
export function Problem({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null
  return <div role="alert" className="notice notice-error">
    <p>{message}</p>
    {onRetry && <button type="button" className="button button-small" onClick={onRetry}>Reintentar</button>}
  </div>
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty">
    <p className="empty-title">{title}</p>
    {children && <p>{children}</p>}
    {action}
  </div>
}

/** Product mark: a receipt sheet in the brand green with a lime total line (same drawing as the favicon). */
export function BrandMark({ size = 28 }: { size?: number }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="6" fill="#176652" />
    <path d="M9 7h14v18l-2.33-1.5L18.33 25 16 23.5 13.67 25l-2.34-1.5L9 25z" fill="#fbfaf5" />
    <path d="M12 11h8M12 14.5h8" stroke="#176652" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 19h8" stroke="#a6c43c" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
}
