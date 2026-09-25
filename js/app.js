const DATA_URL = './data/cards.json';

const gridEl = document.getElementById('card-grid');
const emptyMsg = document.getElementById('empty-msg');

// 1. 스켈레톤 먼저 표시
renderSkeletons(6);

// 2. 데이터 로드
init();

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('cards.json 로드 실패');
    const data = await res.json();

    const cards = (Array.isArray(data) ? data : [])
      .filter((c) => c && c.active !== false && c.url)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    renderCards(cards);
  } catch (err) {
    console.error(err);
    gridEl.innerHTML = '';
    emptyMsg.textContent = '카드를 불러오지 못했습니다.';
    emptyMsg.hidden = false;
  } finally {
    gridEl.removeAttribute('aria-busy');
  }
}

// ── 렌더 ──
function renderCards(cards) {
  gridEl.innerHTML = '';

  if (cards.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  const frag = document.createDocumentFragment();

  cards.forEach((card, idx) => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = card.url;
    a.rel = 'noopener noreferrer';
    if (isExternal(card.url)) {
      a.target = '_blank';
    }

    a.innerHTML = `
      <div class="card-thumb">
        ${
      card.image
        ? `<img class="card-img" src="./${escapeAttr(card.image)}" alt="" loading="lazy" />`
        : `<span class="card-initial">${initialOf(card.label)}</span>`
    }
        ${idx === 0 ? '<span class="card-badge">FEATURED</span>' : ''}
      </div>
      <div class="card-body">
        <span class="card-label">${escapeHtml(card.label || '제목 없음')}</span>
        <span class="card-url">${escapeHtml(prettyUrl(card.url))}</span>
      </div>
    `;

    frag.appendChild(a);
  });

  gridEl.appendChild(frag);
}

// ── 스켈레톤 ──
function renderSkeletons(n) {
  gridEl.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const div = document.createElement('div');
    div.className = 'card skeleton';
    div.innerHTML = `
      <div class="card-thumb"></div>
      <div class="card-body">
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
      </div>
    `;
    gridEl.appendChild(div);
  }
}

// ── 유틸 ──
function initialOf(label) {
  const s = String(label || '').trim();
  if (!s) return '?';
  if (/[가-힣]/.test(s[0])) return s[0];
  return s.slice(0, 2).toUpperCase();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

function isExternal(url) {
  try {
    return new URL(url, location.href).origin !== location.origin;
  } catch {
    return true;
  }
}
