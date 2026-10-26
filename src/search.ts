import { type Card, blankCard, gradeLabel, totalValue, decadeOf } from './types'

/* ------------------------------------------------------------------ *
 * Smart search. Understands things like:
 *   griffey rookie            1989 psa 10           mariners over $100
 *   80s autos                 numbered under 50      fav jeter graded
 *   1987-1990 topps           bgs 9.5               location:binder
 * ------------------------------------------------------------------ */

export interface Filters {
  words: string[]
  yearMin?: number
  yearMax?: number
  valueMin?: number
  valueMax?: number
  rookie?: boolean
  autograph?: boolean
  memorabilia?: boolean
  numbered?: boolean
  graded?: boolean
  favorite?: boolean
  grader?: string
  grade?: string
}

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const STOP = new Set(('what whats which who is are was my the of a an do does did i have has show me all find any ' +
  'cards card list get give with from by in for that and or to how many much worth total value valuable most least ' +
  'top best biggest highest lowest cheapest priciest expensive oldest newest recent recently added count number ' +
  'collection own owned got please about tell s shawn he his him there where located kept keep gain gains profit roi made up any').split(' '))

const num = (s: string) => Number(s.replace(/[$,]/g, ''))

export function parseQuery(q: string, keepStop = true): Filters {
  const f: Filters = { words: [] }
  let s = ' ' + norm(q).replace(/[’']s\b/g, '').replace(/[?!.,]/g, ' ') + ' '

  const take = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    let m: RegExpExecArray | null
    while ((m = re.exec(s))) { fn(m); s = s.replace(m[0], ' '); re.lastIndex = 0 }
  }
  // grader + grade: "psa 10", "bgs9.5"
  take(/\b(psa|bgs|sgc|cgc|beckett)\s*(\d{1,2}(?:\.5)?)?\b/g, m => {
    f.grader = m[1] === 'beckett' ? 'BGS' : m[1].toUpperCase(); if (m[2]) f.grade = m[2]; f.graded = true
  })
  // value comparisons
  take(/(?:over|above|more than|greater than|>\s*=?)\s*\$?\s*([\d,]+(?:\.\d+)?)/g, m => { f.valueMin = num(m[1]) })
  take(/(?:under|below|less than|<\s*=?)\s*\$?\s*([\d,]+(?:\.\d+)?)/g, m => { f.valueMax = num(m[1]) })
  take(/\$\s*([\d,]+(?:\.\d+)?)\s*\+/g, m => { f.valueMin = num(m[1]) })
  take(/\$\s*([\d,]+)\s*-\s*\$?\s*([\d,]+)/g, m => { f.valueMin = num(m[1]); f.valueMax = num(m[2]) })
  // year ranges
  take(/\b(18[6-9]\d|19\d\d|20\d\d)\s*(?:-|to|–|through)\s*(18[6-9]\d|19\d\d|20\d\d)\b/g, m => { f.yearMin = +m[1]; f.yearMax = +m[2] })
  take(/\b(?:before|pre)\s*-?\s*(19\d\d|20\d\d)\b/g, m => { f.yearMax = +m[1] - 1 })
  take(/\b(?:after|since|post)\s*-?\s*(19\d\d|20\d\d)\b/g, m => { f.yearMin = +m[1] + (m[0].includes('since') ? 0 : 1) })
  take(/\b(19|20)?(\d)0'?s\b/g, m => {
    const base = m[1] ? +(m[1] + m[2] + '0') : (+m[2] >= 3 ? 1900 + +m[2] * 10 : 2000 + +m[2] * 10)
    f.yearMin = base; f.yearMax = base + 9
  })
  take(/\b(18[6-9]\d|19\d\d|20[0-3]\d)\b/g, m => { f.yearMin = f.yearMax = +m[1] })
  // flags
  take(/\b(rookies?|rcs?)\b/g, () => { f.rookie = true })
  take(/\b(autos?|autographs?|autographed|signed|signatures?)\b/g, () => { f.autograph = true })
  take(/\b(relics?|patch(?:es)?|jerseys?|memorabilia|game[- ]used)\b/g, () => { f.memorabilia = true })
  take(/\b(numbered|serial(?:ized)?|\/\d+)\b/g, () => { f.numbered = true })
  take(/\b(ungraded|raw)\b/g, () => { f.graded = false })
  take(/\b(graded|slabbed|slabs?)\b/g, () => { f.graded = true })
  take(/\b(favou?rites?|favs?|faves?|starred)\b/g, () => { f.favorite = true })

  f.words = s.split(/\s+/).filter(Boolean).filter(w => keepStop || !STOP.has(w))
  return f
}

const hay = (c: Card) => norm([c.player, c.team, c.set, c.brand, c.variant, c.position, c.cardNumber && '#' + c.cardNumber,
  c.cardNumber, c.location, c.notes, c.condition, gradeLabel(c), c.serial, ...c.tags].join(' '))

export function matches(c: Card, f: Filters): boolean {
  if (f.yearMin != null && (c.year == null || c.year < f.yearMin)) return false
  if (f.yearMax != null && (c.year == null || c.year > f.yearMax)) return false
  if (f.valueMin != null && (c.value ?? 0) < f.valueMin) return false
  if (f.valueMax != null && (c.value ?? 0) > f.valueMax) return false
  if (f.rookie && !c.rookie) return false
  if (f.autograph && !c.autograph) return false
  if (f.memorabilia && !c.memorabilia) return false
  if (f.numbered && !c.serial) return false
  if (f.favorite && !c.favorite) return false
  if (f.graded === true && !c.gradingCompany) return false
  if (f.graded === false && c.gradingCompany) return false
  if (f.grader && c.gradingCompany !== f.grader) return false
  if (f.grade && c.grade !== f.grade) return false
  if (f.words.length) {
    const h = hay(c)
    const toks = h.split(/[^a-z0-9#/.]+/)
    for (const w of f.words) {
      if (w.startsWith('#')) { if (norm(c.cardNumber) !== w.slice(1)) return false; continue }
      const ww = w
      // word must appear as a substring (3+ chars) or start a token
      if (!(ww.length >= 3 ? h.includes(ww) : toks.some(t => t.startsWith(ww) || t === '#' + ww))) return false
    }
  }
  return true
}

export function search(cards: Card[], q: string): Card[] {
  if (!q.trim()) return cards
  return cards.filter(c => matches(c, parseQuery(q)))
}

/* ------------------------------------------------------------------ *
 * "Ask" — answers plain-English questions about the collection.
 * ------------------------------------------------------------------ */
export interface Answer { text: string; cards: Card[] }

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 })

export function ask(cards: Card[], question: string): Answer {
  const q = norm(question)
  const f = parseQuery(question.replace(/\btop\s*\d+\b/i, ' '), false)
  let hits = cards.filter(c => matches(c, f))
  const topN = /\btop\s*(\d+)/.exec(q)?.[1]
  const limit = topN ? +topN : undefined
  const subject = describe(f)
  const one = subject.startsWith('all cards') ? 'card' + subject.slice(9) : subject.replace(/ cards\b/, ' card')
  const qty = (list: Card[]) => list.reduce((a, c) => a + (c.quantity || 1), 0)

  if (!hits.length) return { text: `I couldn't find any cards matching ${subject}.`, cards: [] }

  if (/\bhow many\b|\bcount\b|\bnumber of\b/.test(q)) {
    const n = qty(hits)
    return { text: `Shawn has ${n} card${n === 1 ? '' : 's'} matching ${subject}${n !== hits.length ? ` (${hits.length} different)` : ''}.`, cards: hits }
  }
  if (/\b(total|worth|value of|how much)\b/.test(q) && !/\bmost\b/.test(q)) {
    const v = hits.reduce((a, c) => a + totalValue(c), 0)
    const cost = hits.reduce((a, c) => a + (c.purchasePrice ?? 0) * (c.quantity || 1), 0)
    return { text: `${subject[0].toUpperCase() + subject.slice(1)}: ${qty(hits)} cards worth about ${money(v)}${cost ? `, bought for ${money(cost)} (${v - cost >= 0 ? '+' : ''}${money(v - cost)})` : ''}.`, cards: sortBy(hits, 'value') }
  }
  if (/\b(gain|profit|up the most|made|roi)\b/.test(q)) {
    hits = sortBy(hits.filter(c => c.purchasePrice != null), 'gain')
    if (!hits.length) return { text: `No purchase prices recorded for ${subject} yet.`, cards: [] }
    const c = hits[0]
    return { text: `Biggest gain: ${cardName(c)} — bought ${money(c.purchasePrice ?? 0)}, now ~${money(c.value ?? 0)}.`, cards: hits.slice(0, limit ?? 12) }
  }
  if (/\b(most valuable|most expensive|priciest|best|top|highest|biggest)\b/.test(q)) {
    hits = sortBy(hits, 'value')
    const c = hits[0]
    return { text: limit ? `Top ${limit} by value for ${subject}:` : `Most valuable ${one}: ${cardName(c)} — about ${money(c.value ?? 0)}.`, cards: hits.slice(0, limit ?? 12) }
  }
  if (/\b(cheapest|least valuable|lowest)\b/.test(q)) {
    hits = sortBy(hits, 'value').reverse()
    return { text: `Least valuable ${one}: ${cardName(hits[0])} — ${money(hits[0].value ?? 0)}.`, cards: hits.slice(0, limit ?? 12) }
  }
  if (/\boldest\b/.test(q)) {
    hits = sortBy(hits, 'year').reverse()
    return { text: `Oldest ${one}: ${cardName(hits[0])}.`, cards: hits.slice(0, limit ?? 12) }
  }
  if (/\bnewest\b|\blatest\b/.test(q)) {
    hits = sortBy(hits, 'year')
    return { text: `Newest ${one}: ${cardName(hits[0])}.`, cards: hits.slice(0, limit ?? 12) }
  }
  if (/\brecent(ly)?\b|\blast added\b/.test(q)) {
    hits = sortBy(hits, 'added')
    return { text: `Most recently added ${subject}:`, cards: hits.slice(0, limit ?? 12) }
  }
  if (/\bwhere\b/.test(q)) {
    const locs = [...new Set(hits.map(c => c.location).filter(Boolean))]
    return { text: locs.length ? `${subject[0].toUpperCase() + subject.slice(1)} are in: ${locs.join(', ')}.` : `No storage location recorded for ${subject}.`, cards: hits }
  }
  if (/\b(do i have|does shawn have|have any|got any|is there)\b/.test(q)) {
    return { text: `Yes — ${qty(hits)} card${qty(hits) === 1 ? '' : 's'} matching ${subject}.`, cards: sortBy(hits, 'value') }
  }
  const v = hits.reduce((a, c) => a + totalValue(c), 0)
  return { text: `Found ${hits.length} card${hits.length === 1 ? '' : 's'} matching ${subject} (≈ ${money(v)}).`, cards: sortBy(hits, 'value') }
}

export function cardName(c: Card) {
  return [c.year, c.set, c.cardNumber && `#${c.cardNumber}`, c.player, c.variant, c.rookie && 'RC', gradeLabel(c)].filter(Boolean).join(' ')
}

function describe(f: Filters): string {
  const parts: string[] = []
  if (f.favorite) parts.push('favorite')
  if (f.grader || f.grade) parts.push(`${f.grader ?? ''} ${f.grade ?? ''}`.trim())
  else if (f.graded === true) parts.push('graded')
  else if (f.graded === false) parts.push('raw')
  if (f.rookie) parts.push('rookie')
  if (f.autograph) parts.push('autographed')
  if (f.memorabilia) parts.push('relic')
  if (f.numbered) parts.push('numbered')
  const who = f.words.map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  let s = [parts.join(' '), who].filter(Boolean).join(' ')
  s = s ? `${s} cards` : 'all cards'
  if (f.yearMin && f.yearMin === f.yearMax) s += ` from ${f.yearMin}`
  else if (f.yearMin && f.yearMax) s += ` from ${f.yearMin}–${f.yearMax}`
  else if (f.yearMin) s += ` from ${f.yearMin} on`
  else if (f.yearMax) s += ` up to ${f.yearMax}`
  if (f.valueMin != null) s += ` worth over ${money(f.valueMin)}`
  if (f.valueMax != null) s += ` worth under ${money(f.valueMax)}`
  return s
}

/* ------------------------------------------------------------------ */
export type SortKey = 'value' | 'year' | 'yearAsc' | 'player' | 'added' | 'gain' | 'set'
export function sortBy(cards: Card[], key: SortKey): Card[] {
  const a = [...cards]
  const gain = (c: Card) => (c.purchasePrice == null ? -Infinity : (c.value ?? 0) - c.purchasePrice)
  switch (key) {
    case 'value': return a.sort((x, y) => (y.value ?? 0) - (x.value ?? 0))
    case 'year': return a.sort((x, y) => (y.year ?? 0) - (x.year ?? 0))
    case 'yearAsc': return a.sort((x, y) => (x.year ?? 9999) - (y.year ?? 9999))
    case 'player': return a.sort((x, y) => lastName(x.player).localeCompare(lastName(y.player)) || (x.year ?? 0) - (y.year ?? 0))
    case 'set': return a.sort((x, y) => (x.year ?? 0) - (y.year ?? 0) || x.set.localeCompare(y.set) || x.cardNumber.localeCompare(y.cardNumber, undefined, { numeric: true }))
    case 'gain': return a.sort((x, y) => gain(y) - gain(x))
    case 'added': return a.sort((x, y) => y.createdAt.localeCompare(x.createdAt))
  }
}
export const lastName = (p: string) => {
  const parts = p.replace(/\b(jr|sr|ii|iii)\.?$/i, '').trim().split(/\s+/)
  return (parts[parts.length - 1] || p).toLowerCase()
}

export type GroupKey = 'none' | 'player' | 'year' | 'decade' | 'team' | 'set' | 'grade' | 'location'
export function groupBy(cards: Card[], key: GroupKey): [string, Card[]][] {
  if (key === 'none') return [['', cards]]
  const m = new Map<string, Card[]>()
  const keyOf = (c: Card): string => {
    switch (key) {
      case 'player': return c.player || 'Unknown player'
      case 'year': return c.year ? String(c.year) : 'Unknown year'
      case 'decade': return decadeOf(c.year)
      case 'team': return c.team || 'No team'
      case 'set': return [c.year, c.set].filter(Boolean).join(' ') || 'Unknown set'
      case 'grade': return gradeLabel(c) || (c.condition ? `Raw – ${c.condition}` : 'Raw')
      case 'location': return c.location || 'No location'
    }
  }
  for (const c of cards) { const k = keyOf(c); m.set(k, [...(m.get(k) ?? []), c]) }
  const entries = [...m.entries()]
  if (key === 'player') entries.sort((a, b) => lastName(a[0]).localeCompare(lastName(b[0])))
  else if (key === 'year' || key === 'decade') entries.sort((a, b) => b[0].localeCompare(a[0]))
  else entries.sort((a, b) => b[1].reduce((s, c) => s + totalValue(c), 0) - a[1].reduce((s, c) => s + totalValue(c), 0))
  return entries
}

/* ------------------------------------------------------------------ *
 * Quick add: "1989 Upper Deck #1 Ken Griffey Jr RC PSA 9 $300"
 * ------------------------------------------------------------------ */
const SETS = ['topps chrome update', 'topps chrome', 'topps update', 'topps traded', 'topps heritage', 'topps finest', 'topps stadium club',
  'stadium club', 'bowman chrome', 'bowman draft', 'bowman', 'upper deck sp', 'upper deck', 'donruss optic', 'donruss', 'fleer ultra',
  'fleer update', 'fleer', 'score', 'leaf', 'panini prizm', 'prizm', 'select', 'mosaic', 'gypsy queen', 'allen & ginter', 'allen and ginter',
  'topps', 'sp authentic', 'spx', 'finest', 'pinnacle', 'o-pee-chee', 'opc', 'pacific', 'playoff', 'ultra']
const BRAND_OF: Record<string, string> = { topps: 'Topps', bowman: 'Bowman', 'upper deck': 'Upper Deck', donruss: 'Donruss', fleer: 'Fleer',
  score: 'Score', leaf: 'Leaf', panini: 'Panini', prizm: 'Panini', select: 'Panini', mosaic: 'Panini', 'stadium club': 'Topps',
  'gypsy queen': 'Topps', 'allen': 'Topps', finest: 'Topps', sp: 'Upper Deck', spx: 'Upper Deck', pinnacle: 'Pinnacle', 'o-pee-chee': 'O-Pee-Chee',
  opc: 'O-Pee-Chee', pacific: 'Pacific', playoff: 'Playoff', ultra: 'Fleer' }
const title = (s: string) => s.replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\bSp\b/g, 'SP').replace(/\bSpx\b/g, 'SPx').replace(/\bOpc\b/, 'OPC')

export function quickParse(text: string): Card {
  const c = blankCard()
  let s = ' ' + text + ' '
  const take = (re: RegExp) => { const m = re.exec(s); if (m) s = s.replace(m[0], ' '); return m }
  let m
  if ((m = take(/\$\s*([\d,]+(?:\.\d+)?)/))) c.value = num(m[1])
  if ((m = take(/\b(psa|bgs|sgc|cgc)\s*(\d{1,2}(?:\.5)?)\b/i))) { c.gradingCompany = m[1].toUpperCase() as Card['gradingCompany']; c.grade = m[2] }
  if ((m = take(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b/))) c.serial = `${m[1]}/${m[2]}`
  if ((m = take(/\b(18[6-9]\d|19\d\d|20[0-3]\d)\b/))) c.year = +m[1]
  if ((m = take(/#\s*([A-Za-z]*-?\d+[A-Za-z]*)/))) c.cardNumber = m[1]
  if (take(/\b(rookie|rc)\b/i)) c.rookie = true
  if (take(/\b(auto|autograph|signed)\b/i)) c.autograph = true
  if (take(/\b(relic|patch|jersey)\b/i)) c.memorabilia = true
  if ((m = take(/\b(refractor|gold refractor|prizm silver|silver|gold|holo|chrome refractor|xfractor|sepia|black|red|blue|green|orange)\b/i))) c.variant = title(m[1].toLowerCase())
  const low = norm(s)
  for (const set of SETS) {
    const i = low.indexOf(' ' + set + ' ')
    if (i >= 0) {
      c.set = title(set)
      c.brand = BRAND_OF[set.split(' ')[0]] ?? BRAND_OF[set] ?? title(set.split(' ')[0])
      if (set.startsWith('upper deck')) c.brand = 'Upper Deck'
      s = s.slice(0, i) + ' ' + s.slice(i + set.length + 1)
      break
    }
  }
  c.player = s.replace(/\s+/g, ' ').trim()
  if (c.player === c.player.toLowerCase()) c.player = title(c.player).replace(/\bJr\b\.?/, 'Jr.').replace(/\bSr\b\.?/, 'Sr.')
  return c
}
