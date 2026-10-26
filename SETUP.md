# Connecting the shared cloud database (about 10 minutes, free)

1. Go to https://supabase.com, sign in (GitHub sign-in works), and click **New project**. Name it `card-vault` and pick the free plan and a US West region.
2. Open **SQL Editor → New query**. Paste in all of [`supabase/schema.sql`](supabase/schema.sql), replace `REPLACE_WITH_SHAWNS_EMAIL@example.com` with Shawn's email, and click **Run**.
3. Open **Authentication → URL Configuration**. Set **Site URL** to the site address (for example `https://jfoote22.github.io/shawn-card-vault/`) and add the same URL under **Redirect URLs**.
4. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key. The anon key is meant to be public, and the security comes from the editors list.
5. In the GitHub repo, open **Settings → Secrets and variables → Actions → Variables** and add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
6. Go to **Actions → Deploy to GitHub Pages → Run workflow**. When it finishes, the site uses the cloud database.
7. On the site, open **Data**, enter Shawn's email, and click the sign-in link that arrives. He can then add and edit cards from any device.

Cards Shawn already entered in "this browser" mode don't move automatically. Before switching, use **Data → Full backup (JSON)**, then after switching sign in and use **Data → Import**.
