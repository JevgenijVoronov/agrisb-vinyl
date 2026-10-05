# agrisb vinyl

A vinyl collection (Discogs user `agrisb`), displayed as covers on wooden shelves.

- `index.html`, `styles.css`, `app.js` — the page: "All" shelf and "Artist" shelves by first letter, search, and a detail card with tracklist and a YouTube Music link.
- `data/collection.csv` — collection export from Discogs.
- `scripts/build-data.mjs` — pulls covers, genres, tracklists and original release year from the Discogs API → `data/collection.js`, `covers/`.

To put specific records first (or artists last) on the "All" shelf, edit `PINNED` / `LAST_ARTISTS` at the top of `app.js`.

Update after a new export:

```bash
cp ~/Downloads/<new-export>.csv data/collection.csv
node scripts/build-data.mjs
```

View locally: `npx http-server -p 8080`, then open http://localhost:8080
