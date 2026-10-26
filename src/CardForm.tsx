import { useMemo, useRef, useState } from 'react'
import { type Card, CONDITIONS, GRADERS, POSITIONS, blankCard, gradeLabel } from './types'
import { quickParse, cardName } from './search'
import { CardArt, Badges } from './components'
import { money, resizeImage } from './util'

/* ---------------- Card detail ---------------- */
export function CardDetail({ c, onEdit, onDelete, onFav, onDuplicate }: {
  c: Card; onEdit: () => void; onDelete: () => void; onFav: () => void; onDuplicate: () => void
}) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const gain = c.purchasePrice != null && c.value != null ? (c.value - c.purchasePrice) * (c.quantity || 1) : null
  const rows: [string, React.ReactNode][] = [
    ['Player', c.player], ['Year', c.year], ['Set', c.set], ['Brand', c.brand], ['Card #', c.cardNumber],
    ['Team', c.team], ['Position', c.position], ['Variant / parallel', c.variant], ['Serial #', c.serial],
    ['Grade', gradeLabel(c)], ['Condition', c.condition], ['Quantity', c.quantity > 1 ? c.quantity : ''],
    ['Value (each)', c.value != null ? money(c.value) : ''], ['Paid (each)', c.purchasePrice != null ? money(c.purchasePrice) : ''],
    ['Purchased', c.purchaseDate], ['Gain / loss', gain != null ? <span className={gain >= 0 ? 'up' : 'down'}>{gain >= 0 ? '+' : ''}{money(gain)}</span> : ''],
    ['Location', c.location], ['Tags', c.tags.join(', ')],
  ]
  return (
    <div className="detail">
      <div className="detail-art">
        <CardArt c={c} back={side === 'back'} />
        {(c.image || c.imageBack) && (
          <div className="seg small">
            <button className={side === 'front' ? 'on' : ''} onClick={() => setSide('front')}>Front</button>
            <button className={side === 'back' ? 'on' : ''} onClick={() => setSide('back')} disabled={!c.imageBack}>Back</button>
          </div>
        )}
      </div>
      <div className="detail-info">
        <h2>{c.player}</h2>
        <div className="muted">{cardName({ ...c, player: '' }).trim()}</div>
        <div style={{ margin: '10px 0' }}><Badges c={c} /></div>
        <div className="detail-value">{money(c.value)}{c.quantity > 1 && <span className="muted small"> each · {money((c.value ?? 0) * c.quantity)} total</span>}</div>
        <dl className="kv">{rows.filter(([, v]) => v !== '' && v != null).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {c.notes && <p className="notes">{c.notes}</p>}
        <div className="actions">
          <button className="btn primary" onClick={onEdit}>✎ Edit</button>
          <button className="btn" onClick={onFav}>{c.favorite ? '★ Unfavorite' : '☆ Favorite'}</button>
          <button className="btn" onClick={onDuplicate}>⧉ Duplicate</button>
          <button className="btn danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Add / edit form ---------------- */
export function CardForm({ initial, all, onSave, onCancel }: {
  initial?: Card; all: Card[]; onSave: (c: Card, again: boolean) => Promise<void>; onCancel: () => void
}) {
  const [c, setC] = useState<Card>(initial ?? blankCard())
  const [quick, setQuick] = useState('')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const firstRef = useRef<HTMLInputElement>(null)
  const isEdit = !!initial && all.some(x => x.id === initial.id)

  const opts = useMemo(() => {
    const u = (k: keyof Card) => [...new Set(all.map(x => String(x[k] ?? '')).filter(Boolean))].sort()
    return { player: u('player'), set: u('set'), brand: u('brand'), team: u('team'), location: u('location'), variant: u('variant'),
      tags: [...new Set(all.flatMap(x => x.tags))].sort() }
  }, [all])

  const set = <K extends keyof Card>(k: K, v: Card[K]) => setC(p => ({ ...p, [k]: v }))
  const str = (k: keyof Card) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)
  const n = (k: 'year' | 'value' | 'purchasePrice' | 'quantity') => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, (e.target.value === '' ? (k === 'quantity' ? 1 : null) : Number(e.target.value)) as never)
  const chk = (k: 'rookie' | 'autograph' | 'memorabilia' | 'favorite') => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.checked)

  // Fill team/position from an existing card of the same player
  const onPlayerBlur = () => {
    if (!c.player || (c.team && c.position)) return
    const prev = all.find(x => x.player.toLowerCase() === c.player.toLowerCase())
    if (prev) setC(p => ({ ...p, team: p.team || prev.team, position: p.position || prev.position }))
  }

  const applyQuick = () => {
    if (!quick.trim()) return
    const q = quickParse(quick)
    setC(p => {
      const out = { ...p }
      for (const k of Object.keys(q) as (keyof Card)[]) {
        if (['id', 'createdAt', 'updatedAt', 'quantity', 'tags'].includes(k)) continue
        const v = q[k]
        if (v !== '' && v !== null && v !== false) (out as Record<string, unknown>)[k] = v
      }
      const prev = all.find(x => x.player.toLowerCase() === out.player.toLowerCase())
      if (prev) { out.team ||= prev.team; out.position ||= prev.position }
      return out
    })
    setQuick('')
  }

  const photo = (k: 'image' | 'imageBack') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) set(k, await resizeImage(f))
    e.target.value = ''
  }

  const submit = async (again: boolean) => {
    if (!c.player.trim()) { setMsg('Player name is required.'); firstRef.current?.focus(); return }
    setBusy(true); setMsg('')
    try {
      await onSave({ ...c, player: c.player.trim(), tags: tags.split(/[,;]/).map(s => s.trim()).filter(Boolean) }, again)
      if (again) {
        // keep the "batch" fields so entering a stack from the same set is fast
        const keep = blankCard()
        setC({ ...keep, year: c.year, set: c.set, brand: c.brand, location: c.location, condition: c.condition, purchaseDate: c.purchaseDate })
        setMsg(`Saved ${c.player}. Ready for the next one.`)
        setTimeout(() => firstRef.current?.focus(), 0)
      }
    } catch (err) { setMsg('Could not save: ' + (err as Error).message) }
    finally { setBusy(false) }
  }

  const DL = ({ id, items }: { id: string; items: string[] }) => <datalist id={id}>{items.map(i => <option key={i} value={i} />)}</datalist>

  return (
    <form className="form" onSubmit={e => { e.preventDefault(); submit(false) }}>
      <h2>{isEdit ? 'Edit card' : 'Add a card'}</h2>

      {!isEdit && (
        <div className="quick">
          <label>⚡ Quick add — type it like you'd say it, then press Enter</label>
          <div className="row">
            <input value={quick} onChange={e => setQuick(e.target.value)} placeholder='e.g. 1989 Upper Deck #1 Ken Griffey Jr RC PSA 9 $300'
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyQuick() } }} />
            <button type="button" className="btn" onClick={applyQuick}>Fill in</button>
          </div>
        </div>
      )}

      <div className="form-body">
        <div className="form-fields">
          <fieldset><legend>The card</legend>
            <div className="f-grid">
              <label className="span2">Player *<input ref={firstRef} list="dl-player" value={c.player} onChange={str('player')} onBlur={onPlayerBlur} autoFocus={!isEdit} /></label>
              <label>Year<input type="number" inputMode="numeric" min={1860} max={2100} value={c.year ?? ''} onChange={n('year')} /></label>
              <label>Card #<input value={c.cardNumber} onChange={str('cardNumber')} /></label>
              <label className="span2">Set<input list="dl-set" value={c.set} onChange={str('set')} placeholder="Topps Chrome, Upper Deck…" /></label>
              <label>Brand<input list="dl-brand" value={c.brand} onChange={str('brand')} /></label>
              <label>Position<select value={c.position} onChange={str('position')}><option value=""></option>{POSITIONS.map(p => <option key={p}>{p}</option>)}</select></label>
              <label className="span2">Team<input list="dl-team" value={c.team} onChange={str('team')} /></label>
              <label className="span2">Variant / parallel / insert<input list="dl-variant" value={c.variant} onChange={str('variant')} placeholder="Refractor, Gold /50…" /></label>
            </div>
          </fieldset>

          <fieldset><legend>Special</legend>
            <div className="checks">
              <label><input type="checkbox" checked={c.rookie} onChange={chk('rookie')} /> Rookie card</label>
              <label><input type="checkbox" checked={c.autograph} onChange={chk('autograph')} /> Autograph</label>
              <label><input type="checkbox" checked={c.memorabilia} onChange={chk('memorabilia')} /> Relic / patch</label>
              <label><input type="checkbox" checked={c.favorite} onChange={chk('favorite')} /> ★ Favorite</label>
              <label className="inline">Serial #<input value={c.serial} onChange={str('serial')} placeholder="23/99" style={{ width: 90 }} /></label>
            </div>
          </fieldset>

          <fieldset><legend>Condition</legend>
            <div className="f-grid">
              <label>Graded by<select value={c.gradingCompany} onChange={str('gradingCompany')}>{GRADERS.map(g => <option key={g} value={g}>{g || 'Not graded'}</option>)}</select></label>
              <label>Grade<input value={c.grade} onChange={str('grade')} disabled={!c.gradingCompany} placeholder={c.gradingCompany ? '10, 9.5…' : ''} /></label>
              <label className="span2">Raw condition<select value={c.condition} onChange={str('condition')}><option value=""></option>{CONDITIONS.map(x => <option key={x}>{x}</option>)}</select></label>
            </div>
          </fieldset>

          <fieldset><legend>Value &amp; purchase</legend>
            <div className="f-grid">
              <label>Value (each) $<input type="number" inputMode="decimal" step="0.01" min={0} value={c.value ?? ''} onChange={n('value')} /></label>
              <label>Paid (each) $<input type="number" inputMode="decimal" step="0.01" min={0} value={c.purchasePrice ?? ''} onChange={n('purchasePrice')} /></label>
              <label>Purchase date<input type="date" value={c.purchaseDate} onChange={str('purchaseDate')} /></label>
              <label>Quantity<input type="number" min={1} value={c.quantity} onChange={n('quantity')} /></label>
            </div>
          </fieldset>

          <fieldset><legend>Storage &amp; notes</legend>
            <div className="f-grid">
              <label className="span2">Location<input list="dl-location" value={c.location} onChange={str('location')} placeholder="Binder 1, page 4" /></label>
              <label className="span2">Tags (comma separated)<input list="dl-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="HOF, Mariners" /></label>
              <label className="span4">Notes<textarea rows={3} value={c.notes} onChange={str('notes')} /></label>
            </div>
          </fieldset>
        </div>

        <div className="form-side">
          <div className="preview"><CardArt c={c} /></div>
          <div className="photo-btns">
            <label className="btn">📷 {c.image ? 'Replace front' : 'Add front photo'}<input type="file" accept="image/*" capture="environment" hidden onChange={photo('image')} /></label>
            {c.image && <button type="button" className="btn ghost" onClick={() => set('image', '')}>Remove</button>}
            <label className="btn">📷 {c.imageBack ? 'Replace back' : 'Add back photo'}<input type="file" accept="image/*" capture="environment" hidden onChange={photo('imageBack')} /></label>
            {c.imageBack && <button type="button" className="btn ghost" onClick={() => set('imageBack', '')}>Remove</button>}
          </div>
          <p className="muted small">On a phone this opens the camera.</p>
        </div>
      </div>

      {msg && <div className={'msg' + (msg.startsWith('Saved') ? ' ok' : ' err')}>{msg}</div>}
      <div className="actions sticky">
        <button className="btn primary" disabled={busy} type="submit">{isEdit ? 'Save changes' : 'Save card'}</button>
        {!isEdit && <button className="btn" disabled={busy} type="button" onClick={() => submit(true)}>Save &amp; add another</button>}
        <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>

      <DL id="dl-player" items={opts.player} /><DL id="dl-set" items={opts.set} /><DL id="dl-brand" items={opts.brand} />
      <DL id="dl-team" items={opts.team} /><DL id="dl-location" items={opts.location} /><DL id="dl-variant" items={opts.variant} />
      <DL id="dl-tags" items={opts.tags} />
    </form>
  )
}
