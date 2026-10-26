export type GradingCompany = '' | 'PSA' | 'BGS' | 'SGC' | 'CGC' | 'Other'

export interface Card {
  id: string
  player: string
  year: number | null
  set: string // e.g. "Upper Deck", "Topps Chrome"
  brand: string // manufacturer, e.g. Topps
  cardNumber: string
  team: string
  position: string
  variant: string // parallel / insert, e.g. "Refractor", "Gold"
  rookie: boolean
  autograph: boolean
  memorabilia: boolean // relic / patch / jersey
  serial: string // e.g. "23/99"
  gradingCompany: GradingCompany
  grade: string // e.g. "10", "9.5"
  condition: string // raw condition when ungraded
  quantity: number
  value: number | null // current estimated value per card (USD)
  purchasePrice: number | null
  purchaseDate: string // YYYY-MM-DD
  location: string // binder / box / page
  tags: string[]
  notes: string
  favorite: boolean
  image: string // front photo (data URL or https URL)
  imageBack: string
  createdAt: string
  updatedAt: string
  sample?: boolean
}

export const CONDITIONS = ['Gem Mint', 'Mint', 'NM-MT', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor']
export const GRADERS: GradingCompany[] = ['', 'PSA', 'BGS', 'SGC', 'CGC', 'Other']
export const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF', 'DH', 'IF', 'UT']

export function blankCard(): Card {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    player: '', year: null, set: '', brand: '', cardNumber: '', team: '', position: '',
    variant: '', rookie: false, autograph: false, memorabilia: false, serial: '',
    gradingCompany: '', grade: '', condition: '', quantity: 1,
    value: null, purchasePrice: null, purchaseDate: '', location: '', tags: [], notes: '',
    favorite: false, image: '', imageBack: '', createdAt: now, updatedAt: now,
  }
}

/** Fill any missing fields (for imports / older records). */
export function normalizeCard(c: Partial<Card>): Card {
  const b = blankCard()
  const out = { ...b, ...c } as Card
  out.year = c.year == null || (c.year as unknown) === '' ? null : Number(c.year)
  out.value = c.value == null || (c.value as unknown) === '' ? null : Number(c.value)
  out.purchasePrice = c.purchasePrice == null || (c.purchasePrice as unknown) === '' ? null : Number(c.purchasePrice)
  out.quantity = Number(c.quantity) || 1
  out.tags = Array.isArray(c.tags) ? c.tags : typeof c.tags === 'string' ? (c.tags as string).split(/[,;]/).map(s => s.trim()).filter(Boolean) : []
  for (const k of ['rookie', 'autograph', 'memorabilia', 'favorite'] as const) {
    const v = c[k] as unknown
    out[k] = v === true || v === 'true' || v === 'yes' || v === '1' || v === 1
  }
  return out
}

export const gradeLabel = (c: Card) => (c.gradingCompany ? `${c.gradingCompany}${c.grade ? ' ' + c.grade : ''}` : '')
export const totalValue = (c: Card) => (c.value ?? 0) * (c.quantity || 1)
export const totalCost = (c: Card) => (c.purchasePrice ?? 0) * (c.quantity || 1)
export const decadeOf = (y: number | null) => (y ? `${Math.floor(y / 10) * 10}s` : 'Unknown')
