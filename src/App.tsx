import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { type Card, blankCard } from './types'
import * as store from './store'
import { Modal } from './components'
import { CardDetail, CardForm } from './CardForm'
import { Home, AskPage, Browse, DataPage } from './pages'
import { cardName } from './search'

function useHash() {
  const [h, setH] = useState(location.hash || '#/')
  useEffect(() => {
    const on = () => setH(location.hash || '#/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return h
}

export default function App() {
  const hash = useHash()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Card | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [toast, setToast] = useState('')

  const canEdit = store.mode === 'local' || !!session

  useEffect(() => {
    store.loadCards().then(setCards).catch(e => setError(e.message)).finally(() => setLoading(false))
    store.getSession().then(setSession)
    return store.onAuth(setSession)
  }, [])

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500) }
  const nav = useCallback((h: string) => { location.hash = h; window.scrollTo(0, 0) }, [])
  const open = useCallback((c: Card) => setOpenId(c.id), [])
  const needAuth = () => { if (!canEdit) { flash('Sign in on the Data page to make changes.'); return true } return false }

  const save = async (c: Card) => { setCards(await store.saveCard(c, cards)) }
  const fav = async (c: Card) => {
    if (needAuth()) return
    try { setCards(await store.saveCard({ ...c, favorite: !c.favorite }, cards)) } catch (e) { flash((e as Error).message) }
  }

  const [path, qs] = hash.slice(1).split('?')
  const params = useMemo(() => new URLSearchParams(qs ?? ''), [qs])
  const opened = cards.find(c => c.id === openId) ?? null

  let page: React.ReactNode
  if (loading) page = <div className="page"><p className="muted">Loading cards…</p></div>
  else if (error) page = <div className="page"><div className="msg err">Couldn't load cards: {error}</div></div>
  else if (path === '/browse') page = <Browse key={hash} cards={cards} params={params} open={open} fav={fav} />
  else if (path === '/ask') page = <AskPage cards={cards} q={params.get('q') ?? ''} nav={nav} open={open} fav={fav} />
  else if (path === '/add') page = canEdit
    ? <div className="page"><CardForm key={hash} all={cards} onCancel={() => nav('#/')}
        onSave={async (c, again) => { await save(c); if (!again) { flash(`Saved ${c.player}`); nav('#/browse?sort=added') } }} /></div>
    : <div className="page narrow"><SignIn session={session} /></div>
  else if (path === '/data') page = <DataPage cards={cards} user={store.mode === 'cloud' ? <SignIn session={session} /> : null}
      importCards={async cs => { if (needAuth()) return; setCards(await store.saveMany(cs, cards)) }}
      removeSample={async () => setCards(await store.deleteCards(cards.filter(c => c.sample).map(c => c.id), cards))} />
  else page = <Home cards={cards} nav={nav} open={open} fav={fav} />

  const tab = (p: string, label: string) => <a href={'#' + p} className={path === p || (p === '/' && !path) ? 'on' : ''}>{label}</a>

  return (
    <>
      <header className="top">
        <a href="#/" className="logo"><span className="logo-mark">⚾</span><span>Shawn's <b>Card Vault</b></span></a>
        <nav>{tab('/', 'Home')}{tab('/browse', 'Collection')}{tab('/data', 'Data')}</nav>
        <a href="#/add" className="btn primary add-btn">＋ Add card</a>
      </header>
      <main>{page}</main>
      <footer className="foot muted small">{cards.length} cards · {store.mode === 'cloud' ? 'synced to the cloud' : 'saved in this browser'}</footer>

      {opened && !editing && (
        <Modal onClose={() => setOpenId(null)} wide>
          <CardDetail c={opened} onFav={() => fav(opened)}
            onEdit={() => { if (!needAuth()) setEditing(opened) }}
            onDuplicate={() => { if (!needAuth()) setEditing({ ...opened, id: blankCard().id, createdAt: new Date().toISOString(), image: '', imageBack: '' }) }}
            onDelete={async () => {
              if (needAuth() || !confirm(`Delete ${cardName(opened)}?`)) return
              setCards(await store.deleteCards([opened.id], cards)); setOpenId(null); flash('Card deleted')
            }} />
        </Modal>
      )}
      {editing && (
        <Modal onClose={() => setEditing(null)} wide>
          <CardForm initial={editing} all={cards} onCancel={() => setEditing(null)}
            onSave={async c => { await save(c); setEditing(null); setOpenId(c.id); flash('Saved') }} />
        </Modal>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

function SignIn({ session }: { session: Session | null }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  if (store.mode === 'local') return null
  if (session) return <p>Signed in as <b>{session.user.email}</b>. <button className="link" onClick={() => store.signOut()}>Sign out</button></p>
  return (
    <div className="panel">
      <h3>Sign in to add or edit cards</h3>
      {sent ? <p>✅ Check <b>{email}</b> for a sign-in link.</p> : (
        <form className="row" onSubmit={async e => { e.preventDefault(); try { await store.signIn(email); setSent(true) } catch (x) { setErr((x as Error).message) } }}>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email address" />
          <button className="btn primary">Email me a link</button>
        </form>
      )}
      {err && <div className="msg err">{err}</div>}
    </div>
  )
}
