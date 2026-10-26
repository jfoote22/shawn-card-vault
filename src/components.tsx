import { useEffect, type ReactNode } from 'react'
import { type Card, gradeLabel } from './types'
import { money, teamColors } from './util'

export function Badges({ c, small }: { c: Card; small?: boolean }) {
  const b: [string, string][] = []
  if (c.rookie) b.push(['RC', 'rc'])
  if (c.autograph) b.push(['AUTO', 'auto'])
  if (c.memorabilia) b.push(['RELIC', 'relic'])
  if (c.serial) b.push([`#${c.serial}`, 'serial'])
  if (c.gradingCompany) b.push([gradeLabel(c), 'graded'])
  if (!b.length) return null
  return <span className={'badges' + (small ? ' small' : '')}>{b.map(([t, k]) => <span key={k} className={'badge ' + k}>{t}</span>)}</span>
}

/** Photo if there is one; otherwise a styled stand-in "card" using team colors. */
export function CardArt({ c, back }: { c: Card; back?: boolean }) {
  const src = back ? c.imageBack : c.image
  if (src) return <div className="art photo"><img src={src} alt={c.player} loading="lazy" /></div>
  const [a, b] = teamColors(c.team)
  return (
    <div className="art placeholder" style={{ background: `linear-gradient(150deg, ${a} 0%, ${a} 55%, ${b} 100%)` }}>
      <div className="ph-top"><span>{c.year ?? ''}</span><span>{c.set || c.brand}</span></div>
      <div className="ph-silhouette" aria-hidden>⚾</div>
      <div className="ph-name">{c.player || 'New card'}</div>
      <div className="ph-team">{[c.team, c.position].filter(Boolean).join(' · ')}</div>
      {c.cardNumber && <div className="ph-num">#{c.cardNumber}</div>}
    </div>
  )
}

export function CardTile({ c, onOpen, onFav }: { c: Card; onOpen: (c: Card) => void; onFav?: (c: Card) => void }) {
  return (
    <div className="tile" onClick={() => onOpen(c)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c)}>
      <div className="tile-art">
        <CardArt c={c} />
        {onFav && (
          <button className={'fav' + (c.favorite ? ' on' : '')} title={c.favorite ? 'Unfavorite' : 'Favorite'}
            onClick={e => { e.stopPropagation(); onFav(c) }}>{c.favorite ? '★' : '☆'}</button>
        )}
        {c.quantity > 1 && <span className="qty">×{c.quantity}</span>}
      </div>
      <div className="tile-info">
        <div className="tile-player">{c.player}</div>
        <div className="tile-sub">{[c.year, c.set, c.cardNumber && '#' + c.cardNumber].filter(Boolean).join(' · ')}</div>
        {c.variant && <div className="tile-sub variant">{c.variant}</div>}
        <div className="tile-foot"><Badges c={c} small /><span className="tile-value">{money(c.value)}</span></div>
      </div>
    </div>
  )
}

export function CardGrid({ cards, onOpen, onFav, big }: { cards: Card[]; onOpen: (c: Card) => void; onFav?: (c: Card) => void; big?: boolean }) {
  return <div className={'grid' + (big ? ' big' : '')}>{cards.map(c => <CardTile key={c.id} c={c} onOpen={onOpen} onFav={onFav} />)}</div>
}

export function CardList({ cards, onOpen }: { cards: Card[]; onOpen: (c: Card) => void }) {
  return (
    <div className="list">
      {cards.map(c => (
        <div key={c.id} className="list-row" onClick={() => onOpen(c)}>
          <div className="list-thumb"><CardArt c={c} /></div>
          <div className="list-main">
            <div className="tile-player">{c.favorite && <span className="star">★ </span>}{c.player} <Badges c={c} small /></div>
            <div className="tile-sub">{[c.year, c.set, c.cardNumber && '#' + c.cardNumber, c.variant, c.team].filter(Boolean).join(' · ')}</div>
            {c.location && <div className="tile-sub muted">📦 {c.location}</div>}
          </div>
          <div className="list-value">{money(c.value)}{c.quantity > 1 && <div className="muted small">×{c.quantity}</div>}</div>
        </div>
      ))}
    </div>
  )
}

export function CardTable({ cards, onOpen }: { cards: Card[]; onOpen: (c: Card) => void }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th></th><th>Player</th><th>Year</th><th>Set</th><th>#</th><th>Team</th><th>Variant</th><th>Grade</th><th>Qty</th><th className="r">Paid</th><th className="r">Value</th><th>Location</th></tr></thead>
        <tbody>
          {cards.map(c => (
            <tr key={c.id} onClick={() => onOpen(c)}>
              <td>{c.favorite ? '★' : ''}</td>
              <td><b>{c.player}</b> <Badges c={{ ...c, gradingCompany: '', serial: c.serial }} small /></td>
              <td>{c.year ?? ''}</td><td>{c.set}</td><td>{c.cardNumber}</td><td>{c.team}</td><td>{c.variant}</td>
              <td>{gradeLabel(c) || c.condition}</td><td>{c.quantity}</td>
              <td className="r">{c.purchasePrice != null ? money(c.purchasePrice) : ''}</td>
              <td className="r"><b>{money(c.value)}</b></td><td>{c.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}

export function Stat({ label, value, sub, onClick }: { label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void }) {
  return (
    <div className={'stat' + (onClick ? ' click' : '')} onClick={onClick}>
      <div className="stat-v">{value}</div><div className="stat-l">{label}</div>{sub && <div className="stat-s">{sub}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
