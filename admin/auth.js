// ⚠️ 정적 페이지라 이 값은 누구나 볼 수 있음.
//    "진짜 인증"이 아니라 "접근 제한 수준"으로만 사용.
//    진짜 보안이 필요하면 Firebase Auth / Supabase Auth 등 사용.

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD_HASH =
  'e219ceb09fc7a678d10e992971331dbd5afe5f2a6f020216b82dd92162a20362'; // "password" sha256

const SESSION_KEY = 'admin_session';
const SESSION_TTL = 1000 * 60 * 60 * 2; // 2시간

// ⚠️ GitHub Pages 서브패스 배포 대응
//    - 사용자 페이지(username.github.io): BASE_PATH = ''
//    - 프로젝트 페이지(username.github.io/repo): BASE_PATH = '/repo'
//    로컬 테스트 시엔 '' 로 두면 됨.
const BASE_PATH = '';

const LOGIN_URL = `${BASE_PATH}/admin/index.html`;
const DASHBOARD_URL = `${BASE_PATH}/admin/dashboard.html`;

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 이미 로그인돼 있으면 대시보드로
(function redirectIfLoggedIn() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const { exp } = JSON.parse(raw);
    if (Date.now() < exp) location.replace(DASHBOARD_URL);
  } catch (_) {}
})();

const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('이메일과 비밀번호를 모두 입력하세요.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '확인 중…';

  try {
    const hash = await sha256(password);

    if (email !== ADMIN_EMAIL || hash !== ADMIN_PASSWORD_HASH) {
      showError('이메일 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email, exp: Date.now() + SESSION_TTL })
    );
    location.href = DASHBOARD_URL;
  } catch (err) {
    showError('오류가 발생했습니다. 다시 시도하세요.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '로그인';
  }
});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}
