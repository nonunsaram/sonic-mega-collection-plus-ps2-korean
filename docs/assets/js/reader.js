import { readJSON, element } from './data.js';

const $ = selector => document.querySelector(selector);
const body = document.body;
const image = $('#image'), viewport = $('#viewport'), status = $('#status');
const narrow = matchMedia('(max-width: 860px)');
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

let book, current = 1, zoom = 1, fitWidth = false, statusTimer;

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* 저장소를 쓸 수 없는 환경 */ } },
};

function say(text, { sticky = false, error = false } = {}) {
  clearTimeout(statusTimer);
  status.textContent = text;
  status.classList.toggle('error', error);
  status.classList.remove('quiet');
  if (!sticky && !error) statusTimer = setTimeout(() => status.classList.add('quiet'), 1600);
}

function requestedPage() {
  const number = Number(new URL(location.href).searchParams.get('page'));
  return Math.min(book.pages.length, Math.max(1, Number.isInteger(number) ? number : 1));
}

function pageLabel(entry, index) {
  return `${index + 1}. ${entry.title}${entry.kind === 'appendix' ? ' (부록)' : ''}`;
}

/* ── 확대 ─────────────────────────────── */
function baseSize() {
  const entry = book.pages[current - 1];
  const style = getComputedStyle(viewport);
  const w = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const h = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const scale = fitWidth ? w / entry.width : Math.min(w / entry.width, h / entry.height);
  return { width: entry.width * scale, height: entry.height * scale };
}

function applyZoom(focus) {
  const zoomed = zoom > 1;
  const before = { x: viewport.scrollLeft, y: viewport.scrollTop, w: image.offsetWidth, h: image.offsetHeight };
  viewport.dataset.fit = fitWidth ? 'width' : 'page';
  viewport.classList.toggle('zoomed', zoomed);
  const base = baseSize();
  image.style.width = `${Math.max(1, Math.round(base.width * zoom))}px`;
  image.style.height = `${Math.max(1, Math.round(base.height * zoom))}px`;
  $('#zoom-label').textContent = zoomed ? `${Math.round(zoom * 100)}%` : (fitWidth ? '폭' : '맞춤');
  $('#zoom-out').disabled = !zoomed;
  $('#zoom-in').disabled = zoom >= ZOOM_STEPS.at(-1);
  $('#fit-width').setAttribute('aria-pressed', String(fitWidth));
  if (!zoomed) return;
  // 확대 기준점(포인터 위치 또는 화면 중앙)이 그대로 보이도록 스크롤을 맞춥니다.
  const rect = viewport.getBoundingClientRect();
  const fx = focus ? focus.x - rect.left : viewport.clientWidth / 2;
  const fy = focus ? focus.y - rect.top : viewport.clientHeight / 2;
  const ratio = image.offsetWidth / (before.w || image.offsetWidth);
  viewport.scrollLeft = (before.x + fx) * ratio - fx;
  viewport.scrollTop = (before.y + fy) * ratio - fy;
}

function setZoom(value, focus) {
  zoom = Math.min(ZOOM_STEPS.at(-1), Math.max(1, value));
  applyZoom(focus);
}
const zoomIn = focus => setZoom(ZOOM_STEPS.find(step => step > zoom) ?? zoom, focus);
const zoomOut = () => setZoom([...ZOOM_STEPS].reverse().find(step => step < zoom) ?? 1);

/* ── 페이지 표시 ───────────────────────── */
const preloaded = new Set();
function preload(page) {
  const entry = book.pages[page - 1];
  if (!entry || preloaded.has(entry.image)) return;
  preloaded.add(entry.image);
  new Image().src = entry.image;
}

function show(page, navigation = 'push') {
  current = page;
  const entry = book.pages[page - 1];
  const url = new URL(location.href);
  url.searchParams.set('book', book.id);
  url.searchParams.set('page', String(page));
  if (navigation === 'push') history.pushState(null, '', url);
  if (navigation === 'replace') history.replaceState(null, '', url);

  const total = book.pages.length;
  $('#page').value = String(page);
  $('#scrub').value = String(page);
  $('#page-input').value = String(page);
  $('#prev').disabled = page === 1;
  $('#next').disabled = page === total;
  for (const button of document.querySelectorAll('.thumb')) {
    const active = Number(button.dataset.page) === page;
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    if (active && !(narrow.matches && !body.classList.contains('thumbs-open'))) button.scrollIntoView({ block: 'nearest' });
  }

  const label = `${page} / ${total} · ${entry.title}${entry.kind === 'appendix' ? ' (부록)' : ''}`;
  viewport.classList.add('loading');
  zoom = 1;
  image.onload = () => { viewport.classList.remove('loading'); applyZoom(); say(label); };
  image.onerror = () => { viewport.classList.remove('loading'); say('이미지를 불러오지 못했습니다. 새로고침하거나 원본 이미지를 열어 주세요.', { error: true }); };
  image.alt = `${book.title} — ${entry.title}`;
  image.src = entry.image;
  applyZoom();
  viewport.scrollTo(0, 0);
  $('#original').href = entry.image;
  $('#original').hidden = false;
  document.title = `${book.title} · ${page}페이지 · 한국어 매뉴얼`;
  preload(page + 1); preload(page - 1);
}

const go = page => { if (page >= 1 && page <= book.pages.length && page !== current) show(page); };

/* ── 페이지 목록 ───────────────────────── */
function buildThumbs() {
  $('#thumb-list').replaceChildren(...book.pages.map((entry, index) => {
    const item = element('li');
    const button = element('button', 'thumb');
    button.type = 'button';
    button.dataset.page = String(index + 1);
    button.style.setProperty('--ratio', String(entry.width / entry.height));
    const thumb = element('img');
    thumb.src = entry.thumb || entry.image;
    thumb.alt = '';
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    const caption = element('span');
    caption.append(element('b', '', String(index + 1)), entry.title);
    if (entry.kind === 'appendix') caption.append(element('span', 'kind', '부록'));
    button.title = pageLabel(entry, index);
    button.append(thumb, caption);
    button.onclick = () => { go(index + 1); if (narrow.matches) toggleThumbs(false); };
    item.append(button);
    return item;
  }));
}

function toggleThumbs(force) {
  if (narrow.matches) {
    const open = force ?? !body.classList.contains('thumbs-open');
    body.classList.toggle('thumbs-open', open);
    $('#toggle-thumbs').setAttribute('aria-pressed', String(open));
    if (open) document.querySelector('.thumb[aria-current]')?.scrollIntoView({ block: 'center' });
  } else {
    const hidden = force === undefined ? !body.classList.contains('no-thumbs') : !force;
    body.classList.toggle('no-thumbs', hidden);
    $('#toggle-thumbs').setAttribute('aria-pressed', String(!hidden));
    store.set('manual.thumbs', hidden ? 'hidden' : 'shown');
    requestAnimationFrame(() => applyZoom());
  }
}

function syncThumbState() {
  body.classList.remove('thumbs-open');
  const shown = narrow.matches ? false : store.get('manual.thumbs') !== 'hidden';
  if (!narrow.matches) body.classList.toggle('no-thumbs', !shown);
  $('#toggle-thumbs').setAttribute('aria-pressed', String(shown));
}

/* ── 입력 처리 ─────────────────────────── */
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else body.requestFullscreen?.().catch(() => {});
}

function toggleHelp(force) {
  const open = force ?? $('#help').hidden;
  $('#help').hidden = !open;
  $('#toggle-help').setAttribute('aria-expanded', String(open));
}

function bindPointer() {
  // 확대 상태에서는 마우스로 끌어 이동, 기본 상태에서는 좌우로 밀어 페이지를 넘깁니다.
  let start = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, type: event.pointerType, time: Date.now() };
    if (zoom > 1 && event.pointerType === 'mouse') { viewport.classList.add('dragging'); viewport.setPointerCapture(event.pointerId); }
  });
  viewport.addEventListener('pointermove', event => {
    if (!start || zoom === 1 || start.type !== 'mouse') return;
    viewport.scrollLeft = start.left - (event.clientX - start.x);
    viewport.scrollTop = start.top - (event.clientY - start.y);
  });
  const end = event => {
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (zoom === 1 && start.type !== 'mouse' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - start.time < 800) {
      go(current + (dx < 0 ? 1 : -1));
    }
    viewport.classList.remove('dragging');
    start = null;
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', () => { viewport.classList.remove('dragging'); start = null; });
  viewport.addEventListener('dblclick', event => {
    if (zoom > 1) setZoom(1); else setZoom(2, { x: event.clientX, y: event.clientY });
  });
  viewport.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    if (event.deltaY < 0) zoomIn({ x: event.clientX, y: event.clientY }); else zoomOut();
  }, { passive: false });
}

function bindKeys() {
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input,select,textarea,[contenteditable]')) return;
    const key = event.key;
    const actions = {
      ArrowLeft: () => go(current - 1), ArrowRight: () => go(current + 1),
      PageUp: () => go(current - 1), PageDown: () => go(current + 1),
      Home: () => go(1), End: () => go(book.pages.length),
      '+': () => zoomIn(), '=': () => zoomIn(), '-': () => zoomOut(), '0': () => setZoom(1),
      w: () => { fitWidth = !fitWidth; setZoom(1); }, t: () => toggleThumbs(), f: toggleFullscreen,
      '?': () => toggleHelp(),
      Escape: () => { toggleHelp(false); if (narrow.matches) toggleThumbs(false); },
    };
    const action = actions[key] ?? actions[key.toLowerCase()];
    if (!action) return;
    // 확대 중 방향키는 화면 이동에 사용합니다.
    if (zoom > 1 && key.startsWith('Arrow')) return;
    if (event.target.closest('button') && (key === ' ' || key === 'Enter')) return;
    event.preventDefault();
    action();
  });
}

function bindControls() {
  const total = book.pages.length;
  $('#page').replaceChildren(...book.pages.map((entry, index) => {
    const option = element('option', '', pageLabel(entry, index));
    option.value = String(index + 1);
    return option;
  }));
  $('#scrub').max = String(total);
  $('#page-total').textContent = String(total);
  for (const id of ['#page', '#scrub', '#page-input', '#zoom-in', '#zoom-reset', '#fit-width']) $(id).disabled = false;

  $('#prev').onclick = () => go(current - 1);
  $('#next').onclick = () => go(current + 1);
  $('#page').onchange = event => go(Number(event.target.value));
  $('#scrub').oninput = event => say(pageLabel(book.pages[event.target.value - 1], event.target.value - 1), { sticky: true });
  $('#scrub').onchange = event => go(Number(event.target.value));
  $('#page-input').onchange = event => {
    const page = Number(event.target.value);
    if (Number.isInteger(page)) go(Math.min(total, Math.max(1, page)));
    event.target.value = String(current);
  };
  $('#page-input').onkeydown = event => { if (event.key === 'Enter') event.target.blur(); };
  $('#page-input').onfocus = event => event.target.select();
  $('#zoom-in').onclick = () => zoomIn();
  $('#zoom-out').onclick = () => zoomOut();
  $('#zoom-reset').onclick = () => setZoom(1);
  $('#fit-width').onclick = () => { fitWidth = !fitWidth; setZoom(1); };
  $('#toggle-thumbs').onclick = () => toggleThumbs();
  $('#toggle-help').onclick = () => toggleHelp();
  if (!document.fullscreenEnabled) $('#fullscreen').hidden = true;
  $('#fullscreen').onclick = toggleFullscreen;
  viewport.addEventListener('click', event => {
    if (narrow.matches && body.classList.contains('thumbs-open')) { toggleThumbs(false); event.stopPropagation(); }
  }, true);

  narrow.addEventListener('change', () => { syncThumbState(); applyZoom(); });
  window.addEventListener('resize', () => applyZoom());
  window.addEventListener('popstate', () => show(requestedPage(), 'none'));
  bindPointer();
  bindKeys();
}

try {
  syncThumbState();
  const catalog = await readJSON('data/catalog.json');
  const id = new URL(location.href).searchParams.get('book');
  const match = catalog.manuals.find(entry => entry.id === id);
  if (!match) throw new Error('매뉴얼을 찾을 수 없습니다. 매뉴얼 목록에서 게임을 선택해 주세요.');
  book = await readJSON(match.manifest);
  $('#title').textContent = book.title;
  $('#edition').textContent = `${book.platform} · ${book.sourceEdition} 기준 · ${book.pageCount}페이지${book.appendixCount ? ` (부록 ${book.appendixCount} 포함)` : ''}`;
  buildThumbs();
  bindControls();
  show(requestedPage(), 'replace');
  viewport.focus({ preventScroll: true });
} catch (error) {
  say(error.message, { error: true });
  viewport.classList.remove('loading');
  image.hidden = true;
}
