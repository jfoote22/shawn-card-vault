import type { Card } from './types'

/** Example cards so the site isn't empty on first open. Values are rough placeholders —
 *  delete them from Data → "Remove sample cards" once Shawn adds his own. */
type S = Partial<Card>
const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString()

export const SAMPLE_CARDS: S[] = [
  { player: 'Ken Griffey Jr.', year: 1989, set: 'Upper Deck', brand: 'Upper Deck', cardNumber: '1', team: 'Seattle Mariners', position: 'CF', rookie: true, gradingCompany: 'PSA', grade: '9', value: 300, purchasePrice: 120, purchaseDate: '2019-06-14', location: 'Graded box A', favorite: true, tags: ['HOF', 'Mariners'], notes: 'The card that started it all.', createdAt: d(40) },
  { player: 'Ken Griffey Jr.', year: 1989, set: 'Topps Traded', brand: 'Topps', cardNumber: '41T', team: 'Seattle Mariners', position: 'CF', rookie: true, condition: 'Near Mint', value: 25, purchasePrice: 8, location: 'Binder 1, page 3', tags: ['Mariners'], createdAt: d(39) },
  { player: 'Derek Jeter', year: 1993, set: 'SP', brand: 'Upper Deck', cardNumber: '279', team: 'New York Yankees', position: 'SS', rookie: true, gradingCompany: 'BGS', grade: '8.5', value: 450, purchasePrice: 300, purchaseDate: '2021-03-02', location: 'Graded box A', favorite: true, tags: ['HOF', 'Foil'], createdAt: d(35) },
  { player: 'Mike Trout', year: 2011, set: 'Topps Update', brand: 'Topps', cardNumber: 'US175', team: 'Los Angeles Angels', position: 'CF', rookie: true, gradingCompany: 'PSA', grade: '10', value: 900, purchasePrice: 400, purchaseDate: '2020-01-20', location: 'Graded box A', favorite: true, createdAt: d(30) },
  { player: 'Shohei Ohtani', year: 2018, set: 'Topps Chrome', brand: 'Topps', cardNumber: '150', team: 'Los Angeles Angels', position: 'DH', variant: 'Refractor', rookie: true, condition: 'Mint', value: 180, purchasePrice: 60, location: 'Toploaders box', favorite: true, createdAt: d(25) },
  { player: 'Ichiro Suzuki', year: 2001, set: 'Bowman Chrome', brand: 'Bowman', cardNumber: '338', team: 'Seattle Mariners', position: 'RF', rookie: true, gradingCompany: 'PSA', grade: '9', value: 220, purchasePrice: 150, location: 'Graded box A', favorite: true, tags: ['Mariners', 'HOF'], createdAt: d(20) },
  { player: 'Nolan Ryan', year: 1990, set: 'Topps', brand: 'Topps', cardNumber: '1', team: 'Texas Rangers', position: 'P', condition: 'Near Mint', value: 3, purchasePrice: 1, location: 'Binder 1, page 1', tags: ['HOF', 'Rangers'], createdAt: d(18) },
  { player: 'Frank Thomas', year: 1990, set: 'Topps', brand: 'Topps', cardNumber: '414', team: 'Chicago White Sox', position: '1B', rookie: true, condition: 'Excellent', value: 15, location: 'Binder 1, page 2', tags: ['HOF'], createdAt: d(16) },
  { player: 'Julio Rodríguez', year: 2022, set: 'Topps Chrome Update', brand: 'Topps', cardNumber: 'USC150', team: 'Seattle Mariners', position: 'CF', rookie: true, autograph: true, serial: '45/99', variant: 'Gold Refractor Auto', condition: 'Mint', value: 650, purchasePrice: 425, purchaseDate: '2023-04-10', location: 'Magnetic case shelf', favorite: true, tags: ['Mariners'], createdAt: d(12) },
  { player: 'Cal Ripken Jr.', year: 1982, set: 'Topps Traded', brand: 'Topps', cardNumber: '98T', team: 'Baltimore Orioles', position: 'SS', rookie: true, condition: 'Very Good', value: 60, location: 'Binder 2, page 1', tags: ['HOF'], createdAt: d(10) },
  { player: 'Randy Johnson', year: 1989, set: 'Fleer', brand: 'Fleer', cardNumber: '381', team: 'Montreal Expos', position: 'P', rookie: true, condition: 'Near Mint', value: 6, location: 'Binder 1, page 4', tags: ['HOF', 'Mariners'], createdAt: d(8) },
  { player: 'Aaron Judge', year: 2017, set: 'Topps', brand: 'Topps', cardNumber: '287', team: 'New York Yankees', position: 'RF', rookie: true, memorabilia: true, variant: 'Jersey Relic', condition: 'Mint', value: 40, purchasePrice: 25, location: 'Toploaders box', createdAt: d(6) },
  { player: 'Edgar Martinez', year: 1988, set: 'Fleer', brand: 'Fleer', cardNumber: '378', team: 'Seattle Mariners', position: 'DH', rookie: true, condition: 'Near Mint', quantity: 3, value: 4, location: 'Binder 1, page 3', tags: ['Mariners', 'HOF'], createdAt: d(4) },
  { player: 'Mickey Mantle', year: 1969, set: 'Topps', brand: 'Topps', cardNumber: '500', team: 'New York Yankees', position: '1B', gradingCompany: 'SGC', grade: '4', value: 700, purchasePrice: 550, purchaseDate: '2022-08-19', location: 'Safe', favorite: true, tags: ['HOF', 'Vintage'], notes: 'Last Mantle card issued as an active player.', createdAt: d(2) },
]
