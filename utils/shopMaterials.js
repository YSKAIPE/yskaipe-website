// ─── AFFILIATE CONFIG ───────────────────────────────────────────
// Fill these in when your accounts are approved.
// Leave blank for now — links still work, just without tracking.
const AFFILIATE = {
  amazon:    '',   // e.g. 'yskaipe-20'
  homedepot: '',   // e.g. 'yskaipe'
  lowes:     '',   // e.g. 'yskaipe123'
};

// ─── URL BUILDERS ───────────────────────────────────────────────
function amazonURL(query) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  return AFFILIATE.amazon ? `${base}&tag=${AFFILIATE.amazon}` : base;
}
function homedepotURL(query) {
  const base = `https://www.homedepot.com/s/${encodeURIComponent(query)}`;
  return AFFILIATE.homedepot ? `${base}?cm_mmc=afl-${AFFILIATE.homedepot}` : base;
}
function lowesURL(query) {
  const base = `https://www.lowes.com/search?searchTerm=${encodeURIComponent(query)}`;
  return AFFILIATE.lowes ? `${base}&cm_mmc=afl-${AFFILIATE.lowes}` : base;
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────
// Pass in the materials array Claude returns in JSON.
// Each item: { name: string, qty: string, estimatedCost: string }
export function renderShopMaterials(materials, containerEl) {
  if (!materials || !materials.length) return;

  const section = document.createElement('div');
  section.className = 'sm-section';
  section.innerHTML = `<p class="sm-header">Shop materials</p>`;

  materials.forEach(({ name, qty, estimatedCost }) => {
    const label = qty ? `${name} (×${qty})` : name;
    const badge = estimatedCost ? `<span class="sm-badge">~${estimatedCost}</span>` : '';
    section.innerHTML += `
      <div class="sm-item">
        <p class="sm-item-name">${label} ${badge}</p>
        <div class="sm-links">
          <a class="sm-link" href="${amazonURL(name)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>Amazon
          </a>
          <a class="sm-link" href="${homedepotURL(name)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>Home Depot
          </a>
          <a class="sm-link" href="${lowesURL(name)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>Lowe's
          </a>
        </div>
      </div>`;
  });

  section.innerHTML += `
    <p class="sm-aff-note">Links open retailer search results.</p>`;

  containerEl.appendChild(section);
}
```

---

**Prompt change** — add this to the end of your existing DIY system prompt so Claude returns structured materials data:
```
Return the materials list as a JSON array in this format before the step-by-step instructions:

<materials_json>
[
  { "name": "1/2\" PEX-A pipe 10ft", "qty": "2", "estimatedCost": "$18" },
  { "name": "SharkBite push-fit elbow 1/2\"", "qty": "4", "estimatedCost": "$6" }
]
</materials_json>

Then continue with the normal instructions as markdown.
