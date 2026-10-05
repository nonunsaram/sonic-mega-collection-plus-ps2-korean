import { readJSON, element } from './data.js';

const $ = selector => document.querySelector(selector);
const body = document.body;
const image = $('#image'), viewport = $('#viewport'), status = $('#status');
// 좁은 화면과 가로로 눕힌 휴대폰(높이가 낮은 화면)은 페이지 목록을 서랍으로 엽니다.
const narrow = matchMedia('(max-width: 860px), (max-height: 520px)');
const portrait = matchMedia('(orientation: portrait)');
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

let book, current = 1, zoom = 1, fitWidth = false, statusTimer;
// 한 쪽씩 보기: 좌우로 펼친 면을 왼쪽·오른쪽으로 나눠 크게 봅니다.
// 세로 화면(휴대폰·세운 태블릿)에서는 기본으로 켜고, 가로 화면에서는 끕니다. 직접 바꾸면 화면 방향별로 기억합니다.
let split, half = 0;
const splitKey = () => `manual.split.${portrait.matches ? 'portrait' : 'landscape'}`;
function preferredSplit() {
  const saved = store.get(splitKey());
  return saved ? saved === 'on' : portrait.matches;
}

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

// 가로로 긴 이미지는 두 쪽을 펼친 면입니다 (세로 이미지는 표지 같은 한 쪽).
// 번역자 부록은 가로로 넓은 한 장짜리 문서라 반으로 나누면 문장이 잘리므로 나누지 않습니다.
const isSpread = entry => entry.kind !== 'appendix' && entry.width / entry.height > 1.05;
const splitting = () => split && isSpread(book.pages[current - 1]);

/* ── 확대 ─────────────────────────────── */
function baseSize() {
  const entry = book.pages[current - 1];
  const style = getComputedStyle(viewport);
  const w = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const h = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const scale = splitting() ? Math.min(w / (entry.width / 2), h / entry.height)
    : fitWidth ? w / entry.width : Math.min(w / entry.width, h / entry.height);
  return { width: entry.width * scale, height: entry.height * scale };
}

function applyZoom(focus) {
  const zoomed = zoom > 1;
  const before = { x: viewport.scrollLeft, y: viewport.scrollTop, w: image.offsetWidth, h: image.offsetHeight };
  viewport.dataset.fit = fitWidth ? 'width' : 'page';
  viewport.classList.toggle('zoomed', zoomed);
  body.classList.toggle('is-zoomed', zoomed);
  viewport.classList.toggle('split', splitting());
  viewport.classList.toggle('right', splitting() && half === 1);
  const base = baseSize();
  image.style.width = `${Math.max(1, Math.round(base.width * zoom))}px`;
  image.style.height = `${Math.max(1, Math.round(base.height * zoom))}px`;
  $('#zoom-label').textContent = zoomed ? `${Math.round(zoom * 100)}%` : (fitWidth && !splitting() ? '폭' : '맞춤');
  $('#zoom-out').disabled = !zoomed;
  $('#zoom-in').disabled = zoom >= ZOOM_STEPS.at(-1);
  $('#fit-width').setAttribute('aria-pressed', String(fitWidth));
  $('#split').setAttribute('aria-pressed', String(split));
  updateFlip();
  placeFlip(zoomed ? Infinity : splitting() ? base.width / 2 : base.width);
  if (!zoomed) {
    if (splitting()) viewport.scrollLeft = half ? viewport.scrollWidth : 0;
    return;
  }
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

// 페이지를 넘길 때 방문 기록을 쌓지 않습니다. 휴대폰 뒤로 가기 한 번이면 목록으로 돌아갑니다.
function show(page, navigation = 'replace', side = 'start') {
  current = page;
  const entry = book.pages[page - 1];
  half = side === 'end' && splitting() ? 1 : 0;
  store.set(`manual.last.${book.id}`, String(page));
  if (page > 1) hideResume();
  const url = new URL(location.href);
  url.searchParams.set('book', book.id);
  url.searchParams.set('page', String(page));
  if (navigation === 'replace') history.replaceState(null, '', url);

  const total = book.pages.length;
  $('#page').value = String(page);
  $('#scrub').value = String(page);
  $('#page-input').value = String(page);
  for (const button of document.querySelectorAll('.thumb')) {
    const active = Number(button.dataset.page) === page;
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    if (active && !(narrow.matches && !body.classList.contains('thumbs-open'))) button.scrollIntoView({ block: 'nearest' });
  }

  viewport.classList.add('loading');
  zoom = 1;
  image.onload = () => {
    viewport.classList.remove('loading');
    applyZoom();
    status.classList.remove('error');
    status.classList.add('quiet');
  };
  image.onerror = () => { viewport.classList.remove('loading'); say('이미지를 불러오지 못했습니다. 새로고침하거나 원본 이미지를 열어 주세요.', { error: true }); };
  image.alt = `${book.title} — ${entry.title}`;
  image.src = entry.image;
  // 이미 받아 둔 이미지는 load 이벤트가 오지 않을 수 있으므로 바로 마무리합니다.
  if (image.complete && image.naturalWidth) image.onload();
  applyZoom();
  announce();
  viewport.scrollTo(0, 0);
  updateDownloads();
  document.title = `${book.title} · ${page}페이지 · 한국어 매뉴얼`;
  preload(page + 1); preload(page - 1);
}

const go = page => { if (page >= 1 && page <= book.pages.length && page !== current) show(page); };

// 지금 보는 페이지는 상단 바 제목 아래에 늘 표시합니다 (매뉴얼을 가리지 않도록).
// 좁은 화면에서 제목이 잘려도 왼쪽·오른쪽은 보이도록 쪽수 바로 뒤에 둡니다.
function announce() {
  const entry = book.pages[current - 1];
  const side = splitting() ? (half ? ' 오른쪽' : ' 왼쪽') : '';
  $('#page-info').textContent = `${current} / ${book.pages.length}${side} · ${entry.title}${entry.kind === 'appendix' ? ' (부록)' : ''}`;
}

// 넘김 버튼은 화면 끝이 아니라 매뉴얼 바로 옆에 둡니다 (빈 공간이 넓은 큰 화면에서 손이 덜 갑니다).
function placeFlip(imageWidth) {
  const view = viewport.parentElement;
  const button = $('#prev').offsetWidth || 48;
  const min = parseFloat(getComputedStyle(view).getPropertyValue('--flip-min')) || 8;
  const inset = Math.max(min, (view.clientWidth - imageWidth) / 2 - button - 14);
  view.style.setProperty('--flip-inset', `${Math.round(inset)}px`);
}

function updateFlip() {
  const total = book.pages.length;
  const atStart = current === 1 && (!splitting() || half === 0);
  const atEnd = current === total && (!splitting() || half === 1);
  for (const button of document.querySelectorAll('[data-step]')) button.disabled = button.dataset.step < 0 ? atStart : atEnd;
}

// 이전·다음: 한 쪽씩 보기에서는 펼친 면의 왼쪽 → 오른쪽 → 다음 페이지 순서로 넘깁니다.
function step(direction) {
  if (splitting() && (direction > 0 ? half === 0 : half === 1)) {
    half = direction > 0 ? 1 : 0;
    zoom = 1;
    viewport.scrollTop = 0;
    applyZoom();
    announce();
    return;
  }
  const page = current + direction;
  if (page >= 1 && page <= book.pages.length) show(page, 'replace', direction < 0 ? 'end' : 'start');
}

function toggleSplit(force) {
  split = force ?? !split;
  store.set(splitKey(), split ? 'on' : 'off');
  half = 0;
  setZoom(1);
  viewport.scrollTo(0, 0);
  announce();
}

/* ── 이어 보기 ─────────────────────────── */
let resumeTimer;
function hideResume() { clearTimeout(resumeTimer); $('#resume').hidden = true; }
function offerResume(saved) {
  if (current !== 1 || !Number.isInteger(saved) || saved <= 1 || saved > book.pages.length) return;
  const button = $('#resume');
  button.textContent = `지난번 보던 ${saved}페이지로 이동`;
  button.hidden = false;
  button.onclick = () => { hideResume(); go(saved); };
  resumeTimer = setTimeout(hideResume, 9000);
}

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

/* ── 받기 ─────────────────────────────── */
// 받는 파일 이름은 일부 환경에서 한글이 깨지므로 영문 ID로 만듭니다.
const pageFileName = index => `${String(index + 1).padStart(3, '0')}.${book.pages[index].image.split('.').pop()}`;
const megabytes = bytes => `${Math.max(1, Math.round(bytes / 1048576))}MB`;

function buildDownloads() {
  // 한국어·원본·클린본은 무손실 PNG zip으로 GitHub 릴리스에 있습니다.
  const extras = (book.downloads ?? []).map(item => {
    const link = element('a', 'menu-item');
    link.href = item.url;
    link.append(`${item.label} zip 받기`, element('small', '', [`${item.pages}장`, '무손실 PNG', item.bytes && megabytes(item.bytes)].filter(Boolean).join(' · ')));
    link.onclick = () => toggleDownloads(false);
    return link;
  });
  if (extras.length) {
    const note = element('p', 'menu-note', '클린본은 원본에서 글자만 지운 작업용 이미지입니다.');
    $('#download-extras').replaceChildren(...extras, note);
  }
}

function updateDownloads() {
  $('#download-page').href = book.pages[current - 1].image;
  $('#download-page').download = `${book.id}-ko-${pageFileName(current - 1)}`;
  $('#download-page-note').textContent = `${current}페이지`;
}

function toggleDownloads(force) {
  const open = force ?? $('#download-menu').hidden;
  $('#download-menu').hidden = !open;
  $('#download').setAttribute('aria-expanded', String(open));
  if (open) toggleHelp(false);
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
  if (open) toggleDownloads(false);
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
      step(dx < 0 ? 1 : -1);
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
      ArrowLeft: () => step(-1), ArrowRight: () => step(1),
      PageUp: () => step(-1), PageDown: () => step(1), ' ': () => step(1),
      Home: () => go(1), End: () => go(book.pages.length),
      '+': () => zoomIn(), '=': () => zoomIn(), '-': () => zoomOut(), '0': () => setZoom(1),
      w: () => { fitWidth = !fitWidth; setZoom(1); }, s: () => toggleSplit(), t: () => toggleThumbs(), f: toggleFullscreen,
      '?': () => toggleHelp(), d: () => toggleDownloads(),
      Escape: () => { toggleHelp(false); toggleDownloads(false); hideResume(); if (narrow.matches) toggleThumbs(false); },
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
  for (const id of ['#page', '#scrub', '#page-input', '#zoom-in', '#zoom-reset', '#fit-width', '#split', '#download']) $(id).disabled = false;
  // 펼친 면이 없는 매뉴얼에서는 한 쪽씩 보기 버튼을 숨깁니다.
  $('#split').hidden = !book.pages.some(isSpread);

  for (const button of document.querySelectorAll('[data-step]')) button.onclick = () => step(Number(button.dataset.step));
  $('#page').onchange = event => go(Number(event.target.value));
  $('#scrub').oninput = event => say(pageLabel(book.pages[event.target.value - 1], event.target.value - 1));
  $('#scrub').onchange = event => { status.classList.add('quiet'); go(Number(event.target.value)); };
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
  $('#split').onclick = () => toggleSplit();
  $('#toggle-thumbs').onclick = () => toggleThumbs();
  $('#toggle-help').onclick = () => toggleHelp();
  $('#download').onclick = () => toggleDownloads();
  $('#download-page').onclick = () => toggleDownloads(false);
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#download-menu, #download')) toggleDownloads(false);
    if (!event.target.closest('#help, #toggle-help')) toggleHelp(false);
  });
  if (!document.fullscreenEnabled) $('#fullscreen').hidden = true;
  $('#fullscreen').onclick = toggleFullscreen;
  viewport.addEventListener('click', event => {
    if (narrow.matches && body.classList.contains('thumbs-open')) { toggleThumbs(false); event.stopPropagation(); }
  }, true);

  narrow.addEventListener('change', () => { syncThumbState(); applyZoom(); });
  // 휴대폰·태블릿을 돌리면 그 방향에 맞는 보기(한 쪽씩 / 펼친 면)로 바꿉니다.
  portrait.addEventListener('change', () => {
    const next = preferredSplit();
    if (next === split) return;
    split = next;
    half = 0;
    setZoom(1);
    viewport.scrollTo(0, 0);
    announce();
  });
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
  const collection = catalog.collections?.find(item => item.id === (match.collection ?? 'mega'));
  if (collection) {
    $('#back').href = `index.html#${collection.id}`;
    $('#collection').textContent = collection.titleEn;
  }
  split = preferredSplit();
  $('#title').textContent = book.title;
  $('#edition').textContent = `${book.platform} · ${book.sourceEdition} 기준 · ${book.pageCount}페이지${book.appendixCount ? ` (부록 ${book.appendixCount} 포함)` : ''}`;
  buildThumbs();
  buildDownloads();
  bindControls();
  const saved = Number(store.get(`manual.last.${book.id}`));
  show(requestedPage(), 'replace');
  offerResume(saved);
  viewport.focus({ preventScroll: true });
} catch (error) {
  say(error.message, { error: true });
  viewport.classList.remove('loading');
  image.hidden = true;
}
