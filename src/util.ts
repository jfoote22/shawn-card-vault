import { normalizeCard, type Card } from './types'

export const money = (n: number | null | undefined, cents = false) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents || n % 1 ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 })

/** Shrink a photo so it stores quickly (long edge ~900px, JPEG). */
export function resizeImage(file: File, maxEdge = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const cv = document.createElement('canvas')
      cv.width = Math.round(img.width * scale)
      cv.height = Math.round(img.height * scale)
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
      URL.revokeObjectURL(url)
      resolve(cv.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

// ---------- CSV ----------
const COLS: (keyof Card)[] = ['player', 'year', 'set', 'brand', 'cardNumber', 'team', 'position', 'variant', 'rookie', 'autograph',
  'memorabilia', 'serial', 'gradingCompany', 'grade', 'condition', 'quantity', 'value', 'purchasePrice', 'purchaseDate', 'location',
  'tags', 'notes', 'favorite', 'id', 'createdAt']

const esc = (v: unknown) => {
  const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function toCSV(cards: Card[]) {
  return [COLS.join(','), ...cards.map(c => COLS.map(k => esc(c[k])).join(','))].join('\n')
}

function parseCSVRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim()))
}

// accept friendly header names from other spreadsheets
const ALIASES: Record<string, keyof Card> = {
  name: 'player', 'player name': 'player', season: 'year', 'set name': 'set', product: 'set', manufacturer: 'brand',
  number: 'cardNumber', 'card number': 'cardNumber', 'card #': 'cardNumber', '#': 'cardNumber', parallel: 'variant',
  insert: 'variant', rc: 'rookie', auto: 'autograph', relic: 'memorabilia', patch: 'memorabilia', 'serial number': 'serial',
  numbered: 'serial', grader: 'gradingCompany', 'grading company': 'gradingCompany', qty: 'quantity', price: 'value',
  'est value': 'value', 'estimated value': 'value', 'current value': 'value', cost: 'purchasePrice', 'paid': 'purchasePrice',
  'purchase price': 'purchasePrice', 'date purchased': 'purchaseDate', 'purchase date': 'purchaseDate', box: 'location',
  binder: 'location', fav: 'favorite', favourite: 'favorite',
}
export function fromCSV(text: string): Card[] {
  const rows = parseCSVRows(text)
  if (!rows.length) return []
  const keys = rows[0].map(h => {
    const k = h.trim()
    const exact = COLS.find(c => c.toLowerCase() === k.toLowerCase())
    return exact ?? ALIASES[k.toLowerCase()] ?? null
  })
  return rows.slice(1).map(r => {
    const o: Record<string, unknown> = {}
    keys.forEach((k, i) => { if (k && r[i] !== undefined && r[i] !== '') o[k] = r[i].trim() })
    if (typeof o.value === 'string') o.value = Number(o.value.replace(/[$,]/g, ''))
    if (typeof o.purchasePrice === 'string') o.purchasePrice = Number(o.purchasePrice.replace(/[$,]/g, ''))
    if (!o.id) o.id = crypto.randomUUID()
    return normalizeCard(o as Partial<Card>)
  }).filter(c => c.player)
}

export function download(name: string, text: string, type = 'text/plain') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Stable color per team for the placeholder card art. */
const TEAM_COLORS: [RegExp, string, string][] = [
  [/mariners/i, '#0c2c56', '#005c5c'], [/yankees/i, '#0c2340', '#c4ced3'], [/angels/i, '#ba0021', '#003263'],
  [/rangers/i, '#003278', '#c0111f'], [/white sox/i, '#27251f', '#c4ced4'], [/red sox/i, '#bd3039', '#0c2340'],
  [/orioles/i, '#df4601', '#27251f'], [/expos/i, '#003087', '#e4002b'], [/dodgers/i, '#005a9c', '#ef3e42'],
  [/cubs/i, '#0e3386', '#cc3433'], [/giants/i, '#fd5a1e', '#27251f'], [/braves/i, '#13274f', '#ce1141'],
  [/mets/i, '#002d72', '#ff5910'], [/astros/i, '#002d62', '#eb6e1f'], [/cardinals/i, '#c41e3a', '#0c2340'],
  [/padres/i, '#2f241d', '#ffc425'], [/athletics|a's/i, '#003831', '#efb21e'], [/tigers/i, '#0c2340', '#fa4616'],
  [/phillies/i, '#e81828', '#002d72'], [/blue jays/i, '#134a8e', '#1d2d5c'], [/twins/i, '#002b5c', '#d31145'],
  [/brewers/i, '#12284b', '#ffc52f'], [/reds/i, '#c6011f', '#27251f'], [/pirates/i, '#27251f', '#fdb827'],
  [/royals/i, '#004687', '#bd9b60'], [/rockies/i, '#33006f', '#c4ced4'], [/marlins/i, '#00a3e0', '#ef3340'],
  [/rays/i, '#092c5c', '#8fbce6'], [/nationals/i, '#ab0003', '#14225a'], [/guardians|indians/i, '#00385d', '#e50022'],
  [/diamondbacks/i, '#a71930', '#e3d4ad'],
]
export function teamColors(team: string): [string, string] {
  for (const [re, a, b] of TEAM_COLORS) if (re.test(team)) return [a, b]
  let h = 0
  for (const ch of team || 'x') h = (h * 31 + ch.charCodeAt(0)) % 360
  return [`hsl(${h} 45% 28%)`, `hsl(${(h + 40) % 360} 50% 42%)`]
}
