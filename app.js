// ─── STATE ────────────────────────────────────────────────────
let activeType = 'all';
let activeTags = new Set();
let searchQuery = '';
let items      = [];

// ─── TIER CONFIG ──────────────────────────────────────────────
const TIERS = [
  { tier: 1, label: 'Tier 1', cost: '800 souls' },
  { tier: 2, label: 'Tier 2', cost: '1,600 souls' },
  { tier: 3, label: 'Tier 3', cost: '3,200 souls' },
  { tier: 4, label: 'Tier 4', cost: '6,400 souls' },
];

const TYPE_ICON = {
  weapon:   '⚙',
  vitality: '♥',
  spirit:   '✦',
};

// ─── TOOLTIP ──────────────────────────────────────────────────
const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
document.body.appendChild(tooltip);

function showTooltip(item, e) {
  const upgradesHtml = [
    (item.upgrades_to || []).length > 0
      ? `<div class="tooltip-upgrades-label">Upgrades to</div>
         <div class="tooltip-upgrades">${item.upgrades_to.map(u => `<span class="tooltip-upgrade-tag upgrades-to">${u}</span>`).join('')}</div>`
      : '',
    (item.upgrades_from || []).length > 0
      ? `<div class="tooltip-upgrades-label" style="margin-top:6px">Upgrades from</div>
         <div class="tooltip-upgrades">${item.upgrades_from.map(u => `<span class="tooltip-upgrade-tag upgrades-from">${u}</span>`).join('')}</div>`
      : ''
  ].join('');

  const statsHtml = (item.stats || []).length > 0
    ? `<ul class="tooltip-stats">${item.stats.map(s => `<li>${s}</li>`).join('')}</ul>`
    : '';

  tooltip.innerHTML = `
    <div class="tooltip-name">${item.name}</div>
    <div class="tooltip-cost">$ ${item.cost} souls</div>
    ${item.description ? `<div class="tooltip-desc">${item.description.replace(/\n/g, '<br>')}</div>` : ''}
    ${statsHtml}
    ${upgradesHtml}
  `;

  moveTooltip(e);
  tooltip.classList.add('visible');
}

function moveTooltip(e) {
  const pad = 14;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  if (x + tw > window.innerWidth)  x = e.clientX - tw - pad;
  if (y + th > window.innerHeight) y = e.clientY - th - pad;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ─── LOAD DATA ────────────────────────────────────────────────
async function loadItems() {
  try {
    const res = await fetch('items.json');
    items = await res.json();
  } catch (e) {
    items = [];
  }
  render();
}

// ─── FILTER LOGIC ─────────────────────────────────────────────
function isVisible(item) {
  const typeMatch   = activeType === 'all' || item.type === activeType;
  const searchMatch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase());
  let tagMatch = true;
  if (activeTags.size > 0) {
    tagMatch = [...activeTags].every(tag => {
      if (tag === 'active') return item.active === true;
      if (tag === 'imbue')  return item.imbue  === true;
      return (item.tags || []).includes(tag);
    });
  }
  return typeMatch && tagMatch && searchMatch;
}

function shouldHide(item) {
  if (activeType === 'all') return false;
  return item.type !== activeType;
}

function shouldDim(item) {
  if (shouldHide(item)) return false;
  return !isVisible(item);
}

// ─── RENDER ───────────────────────────────────────────────────
function render() {
  const wrapper = document.getElementById('itemsWrapper');
  wrapper.innerHTML = '';

  TIERS.forEach(({ tier, label, cost }) => {
    const tierItems = items.filter(item => item.tier === tier && !shouldHide(item));
    if (tierItems.length === 0) return;

    const section = document.createElement('div');
    section.className = 'tier-section';
    section.innerHTML = `
      <div class="tier-header">
        <span class="tier-label">${label}</span>
        <div class="tier-line"></div>
        <span class="tier-cost">${cost}</span>
      </div>
      <div class="item-grid" id="grid-tier-${tier}"></div>
    `;
    wrapper.appendChild(section);

    const grid = section.querySelector(`#grid-tier-${tier}`);

    tierItems.forEach(item => {
      const dimmed = shouldDim(item);
      const card = document.createElement('div');
      card.className = `item-card ${item.type}${dimmed ? ' dimmed' : ''}`;

      const imgHtml = item.image
        ? `<div class="item-img-wrap"><img src="${item.image}" alt="${item.name}" loading="lazy"/></div>`
        : `<div class="item-placeholder">${TYPE_ICON[item.type] || '?'}</div>`;

      const tagsHtml = (item.tags || [])
        .map(t => `<span class="tag ${t}">${t.replace('-', ' ')}</span>`)
        .join('');

      card.innerHTML = `
        ${(item.active || item.imbue) ? `<div class="badges">${item.active ? '<span class="active-badge">ACTIVE</span>' : ''}${item.imbue ? '<span class="imbue-badge">IMBUE</span>' : ''}</div>` : ''}
        ${imgHtml}
        <div class="item-name">${item.name}</div>
        <div class="item-cost">${item.cost}</div>
        <div class="item-tags">${tagsHtml}</div>
      `;

      // Tooltip events
      card.addEventListener('mouseenter', e => showTooltip(item, e));
      card.addEventListener('mousemove',  e => moveTooltip(e));
      card.addEventListener('mouseleave', hideTooltip);

      grid.appendChild(card);
    });
  });

  if (wrapper.innerHTML === '') {
    wrapper.innerHTML = `<div class="empty-state">No items found.</div>`;
  }
}

// ─── TAB BUTTONS ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeType = btn.dataset.type;
    render();
  });
});

// ─── CATEGORY LIST ───────────────────────────────────────────
document.querySelectorAll('.cat-item').forEach(item => {
  item.addEventListener('click', () => {
    const tag = item.dataset.tag;
    if (tag === 'all') {
      activeTags.clear();
      document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    } else {
      document.querySelector('.cat-item[data-tag="all"]').classList.remove('active');
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        item.classList.remove('active');
      } else {
        activeTags.add(tag);
        item.classList.add('active');
      }
      if (activeTags.size === 0) {
        document.querySelector('.cat-item[data-tag="all"]').classList.add('active');
      }
    }
    render();
  });
});

document.getElementById('resetCategories').addEventListener('click', () => {
  activeTags.clear();
  document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
  document.querySelector('.cat-item[data-tag="all"]').classList.add('active');
  render();
});

// ─── SEARCH ───────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  render();
});

// ─── INIT ─────────────────────────────────────────────────────
loadItems();
