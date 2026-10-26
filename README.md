# Shawn's Card Vault

A website for tracking and logging Shawn's baseball card collection.

- **Home**: favorites, most valuable, recently added, by decade, top players, and collection stats (count, value, gain vs. paid).
- **Collection**: one-tap views (Favorites, Most valuable, By year, By player, By team, By set, By grade, By location, Rookies, Autos, Relics, Numbered, Biggest gains), plus Grid / List / Table display, any group-by and sort.
- **Search & Ask**: type plain English, like *"most valuable Griffey"*, *"how many rookies"*, *"total value of Mariners cards"*, *"PSA 10"*, *"autos over $100"*, *"1980s rookies"*, *"where are my Jeter cards"* or *"biggest gain"*. The filter box understands `1989`, `1987-1990`, `90s`, `rookie`, `auto`, `relic`, `numbered`, `graded`/`raw`, `psa 10`, `over $50`, `under 20` and `#414`.
- **Add cards fast**: the ⚡ quick-add line turns `1989 Upper Deck #1 Ken Griffey Jr RC PSA 9 $300` into a filled-in form. "Save & add another" keeps year, set and location so you can enter a whole stack quickly. Team and position fill in automatically for players already in the collection.
- **Every detail**: player, year, set, brand, card #, team, position, variant/parallel, rookie, auto, relic, serial #, grading company + grade, raw condition, quantity, value, price paid, purchase date, storage location, tags, notes, favorite, and front and back photos (on a phone the photo button opens the camera).
- **Data**: export a CSV spreadsheet or a full JSON backup, and import from a spreadsheet (common column names are recognized).

## Run locally
```bash
npm install
npm run dev
```

## Storage modes
- **No setup:** cards are saved in the browser you use (localStorage). Good for trying it out, but each device has its own copy.
- **Cloud (recommended):** a free Supabase database shares the same collection on every phone and computer. Anyone with the link can view; only emails listed in the `editors` table can add or edit. See [SETUP.md](SETUP.md).
