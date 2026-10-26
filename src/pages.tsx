import { useMemo, useRef, useState } from 'react'
import { type Card, totalValue, totalCost, normalizeCard } from './types'
import { CardGrid, CardList, CardTable, Stat, Empty } from './components'
import { ask, search, sortBy, groupBy, lastName, type SortKey, type GroupKey } from './search'
import { money, toCSV, fromCSV, download } from './util'
import { mode } from './store'

export type Nav = (hash: string) => void
const qty = (cs: Card[]) => cs.reduce((a, c) => a + (c.quantity || 1), 0)
const sum = (cs: Card[]) => cs.reduce((a, c) => a + totalValue(c), 0)

const EXAMPLES = ['Most valuable Griffey', 'How many rookies do I have?', 'Total value of Mariners cards', 'PSA 10',
  'Autos over $100', '1980s rookies', 'Top 5 most valuable', 'Where are my Jeter cards?', 'Biggest gain']

export function AskBox({ nav, initial = '', autoFocus }: { nav: Nav; initial?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(initial)
  return (
    <form className="askbox" onSubmit={e => { e.preventDefault(); if (q.trim()) nav('#/ask?q=' + encodeURIComponent(q.trim())) }}>
      <span className="ask-icon">🔎</span>
      <input value={q} onChange={e => setQ(e.target.value)} autoFocus={autoFocus}
        placeholder='Search or ask — "most valuable Griffey", "1989 rookies", "PSA 10 over $200"' />
      <button className="btn primary">Ask</button>
    </form>
  )
}

/* ---------------- Home ---------------- */
export function Home({ cards, nav, open, fav }: { cards: Card[]; nav: Nav; open: (c: Card) => void; fav: (c: Card) => void }) {
  const favs = useMemo(() => sortBy(cards.filter(c => c.favorite), 'value'), [cards])
  const top = useMemo(() => sortBy(cards, 'value').slice(0, 6), [cards])
  const recent = useMemo(() => sortBy(cards, 'added').slice(0, 6), [cards])
  const value = sum(cards), cost = cards.reduce((a, c) => a + totalCost(c), 0)
  const players = useMemo(() => {
    const m = new Map<string, Card[]>()
    for (const c of cards) m.set(c.player, [...(m.get(c.player) ?? []), c])
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || sum(b[1]) - sum(a[1])).slice(0, 14)
  }, [cards])
  const decades = useMemo(() => groupBy(cards, 'decade'), [cards])
  const hasSample = cards.some(c => c.sample)

  return (
    <div className="page">
      <section className="hero">
        <h1>Shawn's Card Vault</h1>
        <p className="muted">{qty(cards)} cards · {new Set(cards.map(c => c.player)).size} players · worth about {money(value)}</p>
        <AskBox nav={nav} />
        <div className="chips">{EXAMPLES.slice(0, 6).map(e => <button key={e} className="chip" onClick={() => nav('#/ask?q=' + encodeURIComponent(e))}>{e}</button>)}</div>
      </section>

      {hasSample && <div className="notice">👋 These are <b>sample cards</b> so you can see how it works. Remove them any time from <a href="#/data">Data</a>.</div>}

      <section className="stats">
        <Stat label="Cards" value={qty(cards)} onClick={() => nav('#/browse')} />
        <Stat label="Est. value" value={money(value)} sub={cost ? <span className={value - cost >= 0 ? 'up' : 'down'}>{value - cost >= 0 ? '▲' : '▼'} {money(Math.abs(value - cost))} vs paid</span> : undefined} />
        <Stat label="Rookies" value={qty(cards.filter(c => c.rookie))} onClick={() => nav('#/browse?q=rookie')} />
        <Stat label="Graded" value={qty(cards.filter(c => c.gradingCompany))} onClick={() => nav('#/browse?q=graded&group=grade')} />
        <Stat label="Autos" value={qty(cards.filter(c => c.autograph))} onClick={() => nav('#/browse?q=auto')} />
        <Stat label="Favorites" value={favs.length} onClick={() => nav('#/browse?q=favorite')} />
      </section>

      <Section title="★ Shawn's Favorites" more={() => nav('#/browse?q=favorite')}>
        {favs.length ? <CardGrid cards={favs.slice(0, 8)} onOpen={open} onFav={fav} big />
          : <Empty>Tap the ☆ on any card to make it a favorite and it will show up here.</Empty>}
      </Section>

      <Section title="💰 Most valuable" more={() => nav('#/browse?sort=value')}>
        {top.length ? <CardGrid cards={top} onOpen={open} onFav={fav} /> : <Empty>No cards yet — <a href="#/add">add the first one</a>.</Empty>}
      </Section>

      <Section title="🆕 Recently added" more={() => nav('#/browse?sort=added')}>
        <CardGrid cards={recent} onOpen={open} onFav={fav} />
      </Section>

      <div className="two-col">
        <Section title="📅 By decade">
          <div className="decades">
            {decades.map(([d, cs]) => (
              <button key={d} className="decade" onClick={() => nav('#/browse?group=year&q=' + encodeURIComponent(d === 'Unknown' ? '' : d))}>
                <b>{d}</b><span>{qty(cs)} cards</span><span className="muted">{money(sum(cs))}</span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="🧢 Players" more={() => nav('#/browse?group=player&sort=player')}>
          <div className="chips">
            {players.map(([p, cs]) => <button key={p} className="chip" onClick={() => nav('#/browse?q=' + encodeURIComponent(lastName(p)))}>{p} <span className="muted">{cs.length}</span></button>)}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, more, children }: { title: string; more?: () => void; children: React.ReactNode }) {
  return (
    <section className="section">
      <div className="section-h"><h3>{title}</h3>{more && <button className="link" onClick={more}>See all →</button>}</div>
      {children}
    </section>
  )
}

/* ---------------- Ask results ---------------- */
export function AskPage({ cards, q, nav, open, fav }: { cards: Card[]; q: string; nav: Nav; open: (c: Card) => void; fav: (c: Card) => void }) {
  const a = useMemo(() => ask(cards, q), [cards, q])
  return (
    <div className="page">
      <AskBox key={q} nav={nav} initial={q} />
      <div className="answer"><div className="answer-q">“{q}”</div><div className="answer-a">{a.text}</div></div>
      {a.cards.length > 0 && <CardGrid cards={a.cards} onOpen={open} onFav={fav} />}
      {a.cards.length > 0 && <p><a href={'#/browse?q=' + encodeURIComponent(q)}>Open these in the collection view →</a></p>}
      <h4 className="muted">Try asking</h4>
      <div className="chips">{EXAMPLES.map(e => <button key={e} className="chip" onClick={() => nav('#/ask?q=' + encodeURIComponent(e))}>{e}</button>)}</div>
    </div>
  )
}

/* ---------------- Collection / browse ---------------- */
type View = 'grid' | 'list' | 'table'
const PRESETS: { label: string; q?: string; sort?: SortKey; group?: GroupKey }[] = [
  { label: 'All', q: '' }, { label: '★ Favorites', q: 'favorite' }, { label: '💰 Most valuable', q: '', sort: 'value' },
  { label: '📅 By year', q: '', group: 'year', sort: 'set' }, { label: '🧢 By player', q: '', group: 'player', sort: 'year' },
  { label: '🏟 By team', q: '', group: 'team', sort: 'value' }, { label: '📦 By set', q: '', group: 'set', sort: 'set' },
  { label: '🏅 By grade', q: 'graded', group: 'grade', sort: 'value' }, { label: '🗂 By location', q: '', group: 'location', sort: 'set' },
  { label: 'Rookies', q: 'rookie' }, { label: 'Autos', q: 'auto' }, { label: 'Relics', q: 'relic' }, { label: 'Numbered', q: 'numbered' },
  { label: '📈 Biggest gains', q: '', sort: 'gain' },
]

export function Browse({ cards, params, open, fav }: { cards: Card[]; params: URLSearchParams; open: (c: Card) => void; fav: (c: Card) => void }) {
  const [q, setQ] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState<SortKey>((params.get('sort') as SortKey) ?? 'value')
  const [group, setGroup] = useState<GroupKey>((params.get('group') as GroupKey) ?? 'none')
  const [view, setView] = useState<View>((localStorage.getItem('cv:view') as View) ?? 'grid')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const sync = (nq = q, ns = sort, ng = group) => {
    const p = new URLSearchParams()
    if (nq) p.set('q', nq); if (ns !== 'value') p.set('sort', ns); if (ng !== 'none') p.set('group', ng)
    history.replaceState(null, '', '#/browse' + (p.toString() ? '?' + p : ''))
  }
  const results = useMemo(() => sortBy(search(cards, q), sort), [cards, q, sort])
  const groups = useMemo(() => groupBy(results, group), [results, group])
  const setV = (v: View) => { setView(v); localStorage.setItem('cv:view', v) }

  const render = (cs: Card[]) => view === 'grid' ? <CardGrid cards={cs} onOpen={open} onFav={fav} />
    : view === 'list' ? <CardList cards={cs} onOpen={open} /> : <CardTable cards={cs} onOpen={open} />

  return (
    <div className="page">
      <div className="presets">
        {PRESETS.map(p => {
          const on = (p.q ?? q) === q && (p.group ?? 'none') === group && (p.sort ? p.sort === sort : true) && (p.q !== undefined)
          return <button key={p.label} className={'chip' + (on ? ' on' : '')} onClick={() => {
            const nq = p.q ?? q, ng = p.group ?? 'none', ns = p.sort ?? sort
            setQ(nq); setGroup(ng); setSort(ns); setCollapsed(new Set()); sync(nq, ns, ng)
          }}>{p.label}</button>
        })}
      </div>

      <div className="toolbar">
        <div className="search">
          <span>🔎</span>
          <input value={q} onChange={e => { setQ(e.target.value); sync(e.target.value) }} placeholder='Filter: griffey · 1989 · rookie · psa 10 · over $50 · 90s · binder 2' />
          {q && <button className="link" onClick={() => { setQ(''); sync('') }}>✕</button>}
        </div>
        <label>Group<select value={group} onChange={e => { const g = e.target.value as GroupKey; setGroup(g); sync(q, sort, g) }}>
          <option value="none">None</option><option value="player">Player</option><option value="year">Year</option><option value="decade">Decade</option>
          <option value="team">Team</option><option value="set">Set</option><option value="grade">Grade</option><option value="location">Location</option>
        </select></label>
        <label>Sort<select value={sort} onChange={e => { const s = e.target.value as SortKey; setSort(s); sync(q, s) }}>
          <option value="value">Value (high → low)</option><option value="year">Year (new → old)</option><option value="yearAsc">Year (old → new)</option>
          <option value="player">Player (A–Z, last name)</option><option value="set">Set &amp; card #</option><option value="added">Recently added</option>
          <option value="gain">Biggest gain</option>
        </select></label>
        <div className="seg">
          {(['grid', 'list', 'table'] as View[]).map(v => <button key={v} className={view === v ? 'on' : ''} onClick={() => setV(v)}>{v === 'grid' ? '▦ Grid' : v === 'list' ? '☰ List' : '▤ Table'}</button>)}
        </div>
      </div>

      <div className="result-meta">{qty(results)} cards · {money(sum(results))}{q && <> · filtered by “{q}”</>}</div>

      {!results.length && <Empty>No cards match. <button className="link" onClick={() => { setQ(''); sync('') }}>Clear the filter</button> or <a href="#/add">add a card</a>.</Empty>}

      {group === 'none' ? render(results) : groups.map(([g, cs]) => (
        <div key={g} className="group">
          <button className="group-h" onClick={() => setCollapsed(s => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n })}>
            <span>{collapsed.has(g) ? '▸' : '▾'} {g}</span><span className="muted">{qty(cs)} · {money(sum(cs))}</span>
          </button>
          {!collapsed.has(g) && render(cs)}
        </div>
      ))}
    </div>
  )
}

/* ---------------- Data / settings ---------------- */
export function DataPage({ cards, importCards, removeSample, user }: {
  cards: Card[]; importCards: (cs: Card[]) => Promise<void>; removeSample: () => Promise<void>; user: React.ReactNode
}) {
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const sample = cards.filter(c => c.sample).length
  const stamp = new Date().toISOString().slice(0, 10)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const text = await f.text()
    try {
      const list = f.name.endsWith('.json') ? (JSON.parse(text) as Card[]) : fromCSV(text)
      const cs = list.map(c => normalizeCard(c))
      await importCards(cs)
      setMsg(`Imported ${cs.length} cards.`)
    } catch (err) { setMsg('Import failed: ' + (err as Error).message) }
    e.target.value = ''
  }

  const decades = groupBy(cards, 'decade').map(([d, cs]) => `${d}: ${qty(cs)}`).join(' · ')
  return (
    <div className="page narrow">
      <h2>Data</h2>
      <div className="panel">
        <h3>Where cards are saved</h3>
        {mode === 'cloud'
          ? <p>☁️ <b>Cloud database.</b> Cards are shared across every phone and computer. Anyone with the link can look; you must be signed in to add or change cards.</p>
          : <p>💻 <b>This browser only.</b> Cards are saved on this device. Export a backup now and then, or connect the free cloud database so it works on every device (see <code>SETUP.md</code>).</p>}
        {user}
      </div>
      <div className="panel">
        <h3>Backup &amp; export</h3>
        <p className="muted">{cards.length} cards · {decades}</p>
        <div className="actions">
          <button className="btn" onClick={() => download(`shawn-cards-${stamp}.csv`, toCSV(cards), 'text/csv')}>⬇ Export spreadsheet (CSV)</button>
          <button className="btn" onClick={() => download(`shawn-cards-${stamp}.json`, JSON.stringify(cards, null, 1), 'application/json')}>⬇ Full backup with photos (JSON)</button>
        </div>
      </div>
      <div className="panel">
        <h3>Import</h3>
        <p className="muted">Bring in a spreadsheet (CSV) or a JSON backup. Column names like <i>Player, Year, Set, Card #, Team, Value, Paid, Grade</i> are recognized. Cards with the same id are updated, not duplicated.</p>
        <button className="btn" onClick={() => file.current?.click()}>⬆ Import CSV / JSON</button>
        <input ref={file} type="file" accept=".csv,.json,text/csv,application/json" hidden onChange={onFile} />
        <button className="btn ghost" onClick={() => download('card-template.csv', 'player,year,set,brand,cardNumber,team,position,variant,rookie,autograph,memorabilia,serial,gradingCompany,grade,condition,quantity,value,purchasePrice,purchaseDate,location,tags,notes,favorite\nKen Griffey Jr.,1989,Upper Deck,Upper Deck,1,Seattle Mariners,CF,,yes,,,,PSA,9,,1,300,120,2019-06-14,Graded box A,HOF; Mariners,,yes\n', 'text/csv')}>Download blank template</button>
      </div>
      {sample > 0 && (
        <div className="panel">
          <h3>Sample cards</h3>
          <p className="muted">There are {sample} example cards from the first launch.</p>
          <button className="btn danger" onClick={async () => { if (confirm(`Remove ${sample} sample cards?`)) { await removeSample(); setMsg('Sample cards removed.') } }}>Remove sample cards</button>
        </div>
      )}
      {msg && <div className="msg ok">{msg}</div>}
    </div>
  )
}

