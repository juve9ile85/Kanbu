// ═══════════════════════════════════════════════════════
// GitHub 설정 — 본인 레포 정보로 바꾸세요
// ═══════════════════════════════════════════════════════
const GH = {
  owner: 'juve9ile85',
  repo: 'kanbu',
  branch: 'main',
  path: 'data/cards.json',
  token: '',   // 최초 저장 시 프롬프트로 입력 → localStorage 보관
};

// ── 세션 가드 ──
(function guard() {
  const SESSION_KEY = 'admin_session';
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const { exp, email } = raw ? JSON.parse(raw) : {};
    if (!exp || Date.now() >= exp) {
      localStorage.removeItem(SESSION_KEY);
      location.replace('./index.html');
      return;
    }
    document.getElementById('session-email').textContent = email || '';
  } catch (_) {
    location.replace('./index.html');
  }
})();

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('admin_session');
  location.href = './index.html';
});

// 토큰 로드 / 초기화
GH.token = localStorage.getItem('gh_token') || '';
document.getElementById('clear-token-btn')?.addEventListener('click', () => {
  if (!confirm('저장된 GitHub 토큰을 삭제하시겠습니까?')) return;
  localStorage.removeItem('gh_token');
  GH.token = '';
  setStatus('토큰 삭제됨');
});

// ── 상태 ──
const STORAGE_KEY = 'admin_cards';
const DEFAULT_DATA = [
  { id: 'card-1', label: '이벤트', url: 'https://example.com/event', adminUrl: '', image: '', active: true, order: 1 },
  { id: 'card-2', label: '공지사항', url: 'https://example.com/notice', adminUrl: '', image: '', active: true, order: 2 },
];

let cards = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_DATA];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_DATA];
    return parsed.map((c) => ({ image: '', adminUrl: '', ...c }));
  } catch (_) {
    return [...DEFAULT_DATA];
  }
}

function save() {
  const serializable = cards.map(({ _pendingImage, ...rest }) => rest);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    setStatus(`저장됨 · ${new Date().toLocaleTimeString('ko-KR')}`);
  } catch (err) {
    setStatus('로컬 저장 실패 (용량 초과 가능)');
    console.error(err);
  }
}

function setStatus(msg) {
  const el = document.getElementById('save-status');
  if (el) el.textContent = msg;
}

function uid() {
  return 'card-' + Math.random().toString(36).slice(2, 9);
}

// ── 렌더 ──
const tbody = document.getElementById('cards-tbody');
const emptyMsg = document.getElementById('empty-msg');

function render() {
  cards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  tbody.innerHTML = '';
  emptyMsg.hidden = cards.length > 0;

  cards.forEach((card, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="thumb-cell">
        <label class="thumb-upload" title="클릭하여 이미지 업로드">
          <input type="file" accept="image/*" data-id="${card.id}" data-field="image-file" hidden />
          <span class="thumb-preview">
            ${renderThumbInner(card)}
          </span>
        </label>
      </td>
      <td><input data-id="${card.id}" data-field="label" value="${escapeAttr(card.label)}" /></td>
      <td><input data-id="${card.id}" data-field="url" value="${escapeAttr(card.url)}" placeholder="https://" /></td>
      <td>
        <label class="switch">
          <input type="checkbox" data-id="${card.id}" data-field="active" ${card.active ? 'checked' : ''} />
          <span>${card.active ? 'ON' : 'OFF'}</span>
        </label>
      </td>
      <td class="order-cell">
        <button class="btn-mini" data-action="up" data-id="${card.id}">▲</button>
        <button class="btn-mini" data-action="down" data-id="${card.id}">▼</button>
      </td>
      <td class="manage-cell">
        ${
      card.adminUrl
        ? `<a class="btn-mini admin-link" href="${escapeAttr(card.adminUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(card.adminUrl)}">관리자</a>`
        : ''
    }
        <button class="btn-mini" data-action="edit-admin" data-id="${card.id}">관리자페이지</button>
        <button class="btn-mini danger" data-action="delete" data-id="${card.id}">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPreview();
}

function renderThumbInner(card) {
  if (card._pendingImage?.base64) {
    const ext = card._pendingImage.ext || 'png';
    return `<img src="data:image/${ext};base64,${card._pendingImage.base64}" alt="" />`;
  }
  if (card.image) {
    return `<img src="../${card.image}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';" />
            <span class="thumb-empty" style="display:none">+</span>`;
  }
  return `<span class="thumb-empty">+</span>`;
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 입력 이벤트 ──
tbody.addEventListener('input', (e) => {
  const el = e.target;
  const id = el.dataset.id;
  const field = el.dataset.field;
  if (!id || !field || field === 'image-file') return;
  const card = cards.find((c) => c.id === id);
  if (!card) return;

  if (field === 'active') card.active = el.checked;
  else card[field] = el.value;

  save();
  if (field === 'active') {
    el.parentElement.querySelector('span').textContent = el.checked ? 'ON' : 'OFF';
  }
  renderPreview();
});

// ── 이미지 파일 선택 ──
tbody.addEventListener('change', async (e) => {
  const input = e.target;
  if (input.dataset.field !== 'image-file') return;

  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드 가능합니다.');
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('2MB 이하 이미지만 업로드 가능합니다.');
    input.value = '';
    return;
  }

  const cardId = input.dataset.id;
  const card = cards.find((c) => c.id === cardId);
  if (!card) return;

  try {
    const base64 = await fileToBase64(file);
    const ext = extOf(file.name);
    const imagePath = `img/${cardId}-${Date.now()}.${ext}`;

    card.image = imagePath;
    card._pendingImage = { path: imagePath, base64, ext };

    save();
    render();
    setStatus('이미지 선택됨 — "적용"을 눌러 반영하세요');
  } catch (err) {
    alert('이미지 처리 실패: ' + err.message);
  } finally {
    input.value = '';
  }
});

// ── 클릭 이벤트 (순서/삭제/관리자페이지) ──
tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  // 관리자페이지 URL 모달
  if (action === 'edit-admin') {
    openAdminUrlModal(id);
    return;
  }

  const card = cards.find((c) => c.id === id);
  if (!card) return;

  if (action === 'delete') {
    if (!confirm(`"${card.label}" 카드를 삭제하시겠습니까?`)) return;
    cards = cards.filter((c) => c.id !== id);
    reorder();
    save();
    render();
  }

  if (action === 'up' || action === 'down') {
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((c) => c.id === id);
    const j = action === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    sorted.forEach((c, k) => (c.order = k + 1));
    cards = sorted;
    save();
    render();
  }
});

function reorder() {
  cards.sort((a, b) => a.order - b.order).forEach((c, i) => (c.order = i + 1));
}

// ── 카드 추가 ──
document.getElementById('add-btn').addEventListener('click', () => {
  const maxOrder = cards.reduce((m, c) => Math.max(m, c.order ?? 0), 0);
  cards.push({
    id: uid(),
    label: '새 카드',
    url: '',
    adminUrl: '',
    image: '',
    active: true,
    order: maxOrder + 1,
  });
  save();
  render();
});

// ═══════════════════════════════════════════════════════
// 관리자페이지 URL 모달
// ═══════════════════════════════════════════════════════
const modalEl = document.getElementById('admin-url-modal');
const modalInput = document.getElementById('admin-url-input');
const modalHint = document.getElementById('modal-hint');
let editingCardId = null;

function openAdminUrlModal(cardId) {
  const card = cards.find((c) => c.id === cardId);
  if (!card) return;
  editingCardId = cardId;
  modalInput.value = card.adminUrl || '';
  modalHint.textContent = `카드: ${card.label || '(제목 없음)'}`;
  modalEl.hidden = false;
  setTimeout(() => modalInput.focus(), 0);
}

function closeAdminUrlModal() {
  modalEl.hidden = true;
  editingCardId = null;
  modalInput.value = '';
  modalHint.textContent = '';
}

function saveAdminUrl() {
  const card = cards.find((c) => c.id === editingCardId);
  if (!card) return;
  const value = modalInput.value.trim();

  if (value && !/^https?:\/\//i.test(value)) {
    alert('http:// 또는 https:// 로 시작하는 URL을 입력하세요.');
    return;
  }

  card.adminUrl = value;
  save();
  closeAdminUrlModal();
  render();
}

function clearAdminUrl() {
  const card = cards.find((c) => c.id === editingCardId);
  if (!card) return;
  card.adminUrl = '';
  save();
  closeAdminUrlModal();
  render();
}

document.getElementById('modal-save-btn').addEventListener('click', saveAdminUrl);
document.getElementById('modal-clear-btn').addEventListener('click', clearAdminUrl);
document.getElementById('modal-cancel-btn').addEventListener('click', closeAdminUrlModal);
document.getElementById('modal-close-btn').addEventListener('click', closeAdminUrlModal);

modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) closeAdminUrlModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalEl.hidden) closeAdminUrlModal();
});

modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveAdminUrl();
  }
});

// ── 미리보기 ──
const previewEl = document.getElementById('preview');

function renderPreview() {
  const visible = cards
    .filter((c) => c.active)
    .sort((a, b) => a.order - b.order);

  previewEl.innerHTML = '';

  if (visible.length === 0) {
    previewEl.innerHTML = '<p class="empty">표시할 카드가 없습니다.</p>';
    return;
  }

  visible.forEach((card) => {
    const a = document.createElement('a');
    a.className = 'user-card';
    a.href = card.url || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (!card.url) {
      a.addEventListener('click', (e) => e.preventDefault());
      a.classList.add('disabled');
    }

    const thumbHtml = (() => {
      if (card._pendingImage?.base64) {
        const ext = card._pendingImage.ext || 'png';
        return `<img src="data:image/${ext};base64,${card._pendingImage.base64}" alt="" />`;
      }
      if (card.image) {
        return `<img src="../${card.image}" alt="" />`;
      }
      return '';
    })();

    a.innerHTML = `
      ${thumbHtml ? `<span class="user-card-thumb">${thumbHtml}</span>` : ''}
      <span class="user-card-label">${escapeHtml(card.label || '제목 없음')}</span>
      <span class="user-card-url">${escapeHtml(card.url || 'URL 미입력')}</span>
    `;
    previewEl.appendChild(a);
  });
}

// ── GitHub 저장 ──
document.getElementById('publish-btn').addEventListener('click', publishToGitHub);

async function publishToGitHub() {
  if (!GH.token) {
    const t = prompt(
      'GitHub Personal Access Token을 입력하세요.\n(브라우저 localStorage에 저장됩니다. fine-grained, Contents: Read and write 권한 필요)'
    );
    if (!t) return;
    GH.token = t.trim();
    localStorage.setItem('gh_token', GH.token);
  }

  reorder();
  setStatus('GitHub에 저장 중…');

  try {
    const pendingImages = cards.filter((c) => c._pendingImage);
    for (const card of pendingImages) {
      setStatus(`이미지 업로드 중… (${card.id})`);
      await commitFileToGitHub(
        card._pendingImage.path,
        card._pendingImage.base64,
        `chore(cards): upload image for ${card.id}`,
        true
      );
      delete card._pendingImage;
    }

    setStatus('cards.json 커밋 중…');
    const content = JSON.stringify(
      cards.map(({ id, label, url, adminUrl, image, active, order }) => ({
        id, label, url,
        adminUrl: adminUrl || '',
        image: image || '',
        active, order,
      })),
      null,
      2
    );
    const result = await commitFileToGitHub(
      GH.path,
      content,
      `chore(cards): update cards.json ${new Date().toISOString()}`,
      false
    );

    save();
    setStatus(
      `저장 완료 · ${new Date().toLocaleTimeString('ko-KR')} (커밋 ${result.commit.sha.slice(0, 7)})`
    );
    alert('GitHub에 저장되었습니다.\nGitHub Pages 반영까지 1~2분 걸립니다.');
  } catch (err) {
    console.error(err);
    setStatus('저장 실패');
    alert('GitHub 저장 실패: ' + err.message);
  }
}

async function commitFileToGitHub(path, content, message, isBase64) {
  const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;

  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(GH.branch)}`, {
    headers: {
      Authorization: `Bearer ${GH.token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  let sha;
  if (getRes.ok) {
    sha = (await getRes.json()).sha;
  } else if (getRes.status !== 404) {
    const err = await getRes.json().catch(() => ({}));
    throw new Error(err.message || `조회 실패 (${getRes.status})`);
  }

  const body = {
    message,
    content: isBase64 ? content : base64EncodeUnicode(content),
    branch: GH.branch,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GH.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `커밋 실패 (${putRes.status})`);
  }
  return putRes.json();
}

// ── 유틸 ──
function base64EncodeUnicode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function extOf(name) {
  const m = String(name).match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : 'png';
}

// ── 초기 렌더 ──
render();
