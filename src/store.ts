import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'
import { normalizeCard, type Card } from './types'
import { SAMPLE_CARDS } from './sample'

/**
 * Storage layer.
 *  - If VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set at build time, cards live in Supabase
 *    (shared across all devices; anyone can view, only signed-in users can edit).
 *  - Otherwise cards live in this browser's localStorage (good for trying it out).
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null
export const mode: 'cloud' | 'local' = supabase ? 'cloud' : 'local'

const LS_KEY = 'card-vault:cards:v1'

// ---- row mapping (Supabase uses snake_case columns) ----
type Row = Record<string, unknown>
const toRow = (c: Card): Row => ({
  id: c.id, player: c.player, year: c.year, set_name: c.set, brand: c.brand, card_number: c.cardNumber,
  team: c.team, position: c.position, variant: c.variant, rookie: c.rookie, autograph: c.autograph,
  memorabilia: c.memorabilia, serial: c.serial, grading_company: c.gradingCompany, grade: c.grade,
  condition: c.condition, quantity: c.quantity, value: c.value, purchase_price: c.purchasePrice,
  purchase_date: c.purchaseDate || null, location: c.location, tags: c.tags, notes: c.notes,
  favorite: c.favorite, image: c.image, image_back: c.imageBack, created_at: c.createdAt, updated_at: c.updatedAt,
})
const fromRow = (r: Row): Card => normalizeCard({
  id: r.id as string, player: r.player as string, year: r.year as number | null, set: (r.set_name as string) ?? '',
  brand: (r.brand as string) ?? '', cardNumber: (r.card_number as string) ?? '', team: (r.team as string) ?? '',
  position: (r.position as string) ?? '', variant: (r.variant as string) ?? '', rookie: !!r.rookie,
  autograph: !!r.autograph, memorabilia: !!r.memorabilia, serial: (r.serial as string) ?? '',
  gradingCompany: ((r.grading_company as string) ?? '') as Card['gradingCompany'], grade: (r.grade as string) ?? '',
  condition: (r.condition as string) ?? '', quantity: (r.quantity as number) ?? 1, value: r.value as number | null,
  purchasePrice: r.purchase_price as number | null, purchaseDate: (r.purchase_date as string) ?? '',
  location: (r.location as string) ?? '', tags: (r.tags as string[]) ?? [], notes: (r.notes as string) ?? '',
  favorite: !!r.favorite, image: (r.image as string) ?? '', imageBack: (r.image_back as string) ?? '',
  createdAt: r.created_at as string, updatedAt: r.updated_at as string,
})

// ---- local ----
function readLocal(): Card[] {
  const raw = localStorage.getItem(LS_KEY)
  if (raw === null) {
    const seeded = SAMPLE_CARDS.map(c => normalizeCard({ ...c, sample: true }))
    localStorage.setItem(LS_KEY, JSON.stringify(seeded))
    return seeded
  }
  try { return (JSON.parse(raw) as Partial<Card>[]).map(normalizeCard) } catch { return [] }
}
function writeLocal(cards: Card[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cards)) }
  catch { alert('Browser storage is full — photos take a lot of space. Use Data → Export, or connect the cloud database.') }
}

// ---- public API ----
export async function loadCards(): Promise<Card[]> {
  if (!supabase) return readLocal()
  const { data, error } = await supabase.from('cards').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(fromRow)
}

export async function saveCard(card: Card, all: Card[]): Promise<Card[]> {
  const c = { ...card, updatedAt: new Date().toISOString() }
  delete c.sample
  if (supabase) {
    const { error } = await supabase.from('cards').upsert(toRow(c))
    if (error) throw error
  }
  const next = all.some(x => x.id === c.id) ? all.map(x => (x.id === c.id ? c : x)) : [c, ...all]
  if (!supabase) writeLocal(next)
  return next
}

export async function saveMany(cards: Card[], all: Card[]): Promise<Card[]> {
  if (supabase) {
    for (let i = 0; i < cards.length; i += 200) {
      const { error } = await supabase.from('cards').upsert(cards.slice(i, i + 200).map(toRow))
      if (error) throw error
    }
  }
  const ids = new Set(cards.map(c => c.id))
  const next = [...cards, ...all.filter(c => !ids.has(c.id))]
  if (!supabase) writeLocal(next)
  return next
}

export async function deleteCards(ids: string[], all: Card[]): Promise<Card[]> {
  if (supabase) {
    const { error } = await supabase.from('cards').delete().in('id', ids)
    if (error) throw error
  }
  const s = new Set(ids)
  const next = all.filter(c => !s.has(c.id))
  if (!supabase) writeLocal(next)
  return next
}

// ---- auth (cloud mode only) ----
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  return (await supabase.auth.getSession()).data.session
}
export function onAuth(cb: (s: Session | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s))
  return () => data.subscription.unsubscribe()
}
export async function signIn(email: string) {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split('#')[0] } })
  if (error) throw error
}
export async function signOut() { await supabase?.auth.signOut() }
