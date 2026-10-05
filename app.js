const records = (window.COLLECTION || []).map(r => ({ ...r, origYear: r.originalYear || r.year }));
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LABEL_COLORS = ["#c0392b", "#e0a15a", "#2e86ab", "#f4d35e", "#6a994e", "#9b5de5", "#ee6c4d", "#f1faee"];
const sortKey = s => s.replace(/^the\s+/i, "").toLocaleLowerCase();
const artistSort = (a, b) => sortKey(a.artist).localeCompare(sortKey(b.artist)) || (a.origYear || 0) - (b.origYear || 0);

// Release ids shown first on the "All" shelf, in this order; the rest follow newest-added first.
const PINNED = [
  // e.g. 9218599, // Agnes Obel — Citizen Of Glass
];
// Artists placed at the very end of the "All" shelf.
const LAST_ARTISTS = [];
const pinRank = r => {
  const i = PINNED.indexOf(r.id);
  if (i >= 0) return i;
  const j = LAST_ARTISTS.indexOf(r.artist);
  return j >= 0 ? PINNED.length + 1 + j : PINNED.length;
};

const groupers = {
  all: {
    key: () => "all",
    label: () => "Whole collection",
    order: () => 0,
    sort: (a, b) => pinRank(a) - pinRank(b) || b.added.localeCompare(a.added),
  },
  artist: {
    key: r => { const c = sortKey(r.artist)[0].toUpperCase(); return /[A-ZĀ-Ž]/.test(c) ? (c === "Ā" ? "A" : c === "Ē" ? "E" : c) : /[А-ЯЁ]/.test(c) ? "Cyrillic" : "#"; },
    label: k => k,
    order: (a, b) => (a.key === "Cyrillic") - (b.key === "Cyrillic") || a.key.localeCompare(b.key),
    sort: artistSort,
  },
};

let state = { group: "all", q: "" };
try { state.group = localStorage.getItem("vinyl.group") || "all"; } catch {}
if (!groupers[state.group]) state.group = "all";

function plural(n) {
  return n === 1 ? "record" : "records";
}

function coverHTML(r) {
  return r.cover
    ? `<img class="art" src="${esc(r.cover)}" alt="" loading="lazy" decoding="async">`
    : `<div class="art fallback">${esc(r.title)}</div>`;
}

// How many covers fit on one plank at the current width.
let renderedPerRow = 0;
function recordsPerRow() {
  const css = getComputedStyle(document.documentElement);
  const gap = parseFloat(css.getPropertyValue("--gap")), pad = parseFloat(css.getPropertyValue("--pad"));
  const cover = $("#probe").getBoundingClientRect().width;
  return Math.max(1, Math.floor(($("#shelves").clientWidth - 2 * pad + gap) / (cover + gap)));
}

function render() {
  const q = state.q.trim().toLocaleLowerCase();
  const list = records.filter(r => !q || [r.artist, r.title, r.label, ...r.genres, ...r.styles].join(" ").toLocaleLowerCase().includes(q));
  const g = groupers[state.group];
  const map = new Map();
  for (const r of list) { const k = g.key(r); if (!map.has(k)) map.set(k, []); map.get(k).push(r); }
  const groups = [...map].map(([key, items]) => ({ key, items: items.sort(g.sort) })).sort(g.order);

  $("#summary").textContent = `${records.length} ${plural(records.length)} · ${new Set(records.map(r => r.artist)).size} artists`;

  if (!groups.length) { $("#shelves").innerHTML = `<p class="empty">Nothing found</p>`; return; }

  const perRow = renderedPerRow = recordsPerRow();
  const tiers = items => Array.from({ length: Math.ceil(items.length / perRow) }, (_, i) => items.slice(i * perRow, (i + 1) * perRow));

  $("#shelves").innerHTML = groups.map(({ key, items }) => `
    <section class="shelf">
      <div class="shelf-head"><h2>${esc(g.label(key))}</h2><span>${items.length}</span></div>
      ${tiers(items).map(tier => `
      <div class="tier">
        <div class="row">${tier.map(r => `
          <button class="rec" data-id="${r.id}" style="--label:${LABEL_COLORS[r.id % LABEL_COLORS.length]}" aria-label="${esc(r.artist)} — ${esc(r.title)}">
            <div class="sleeve"><div class="disc"></div>${coverHTML(r)}</div>
          </button>`).join("")}
        </div>
        <div class="plank"></div>
        <div class="shelf-meta">${tier.map(r => `
          <div class="meta"><b>${esc(r.title)}</b><i>${esc(r.artist)}${r.origYear ? " · " + r.origYear : ""}</i></div>`).join("")}
        </div>
      </div>`).join("")}
    </section>`).join("");
}

window.addEventListener("resize", () => { if (recordsPerRow() !== renderedPerRow) render(); });

function openDetail(id) {
  const r = records.find(x => x.id === id);
  if (!r) return;
  const dlg = $("#detail");
  const rows = [
    ["Label", [...new Set(r.label.split(", "))].join(", ")], ["Cat. #", r.catno], ["Format", r.format], ["Year", r.origYear], ["Pressing", r.year !== r.origYear ? r.year : ""],
    ["Country", r.country], ["Condition", r.condition], ["Added", r.added], ["Notes", r.notes],
  ].filter(([, v]) => v);
  dlg.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="detail">
      <div class="detail-art" style="--label:${LABEL_COLORS[r.id % LABEL_COLORS.length]}">
        <div class="stack"><div class="disc"></div>${coverHTML(r).replace(' loading="lazy"', "")}</div>
      </div>
      <div class="detail-body">
        <div class="artist">${esc(r.artist)}</div>
        <h3>${esc(r.title)}</h3>
        <a class="link" href="https://music.youtube.com/search?q=${encodeURIComponent(`${r.artist} ${r.title}`)}" target="_blank" rel="noopener">Listen on YouTube Music ↗</a>
        <div class="chips">${[...r.genres, ...r.styles].map(s => `<span class="chip">${esc(s)}</span>`).join("")}</div>
        ${r.tracklist?.length ? `<ol class="tracks">${r.tracklist.map(t => `<li><span class="pos">${esc(t.pos)}</span><span>${esc(t.title)}</span><span class="dur">${esc(t.dur)}</span></li>`).join("")}</ol>` : ""}
        <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      </div>
    </div>`;
  dlg.querySelector(".close").onclick = () => dlg.close();
  dlg.showModal();
}

$("#shelves").addEventListener("click", e => {
  const rec = e.target.closest(".rec");
  if (rec) openDetail(Number(rec.dataset.id));
});
$("#detail").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
document.querySelectorAll(".seg button").forEach(b => {
  b.setAttribute("aria-pressed", b.dataset.group === state.group);
  b.onclick = () => {
    state.group = b.dataset.group;
    try { localStorage.setItem("vinyl.group", state.group); } catch {}
    document.querySelectorAll(".seg button").forEach(x => x.setAttribute("aria-pressed", x === b));
    render();
  };
});
$(".search").addEventListener("input", e => { state.q = e.target.value; render(); });

render();
