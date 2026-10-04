import { readJSON, element } from './data.js';
const $ = selector => document.querySelector(selector);
const image = $('#image'), status = $('#status');
let book, current = 1;
function requestedPage() {
  const raw = new URL(location.href).searchParams.get('page');
  const number = Number(raw);
  return Math.min(book.pages.length, Math.max(1, Number.isInteger(number) ? number : 1));
}
function zoom() {
  const value = $('#zoom').value;
  $('#viewport').classList.toggle('zoomed', value !== 'fit');
  image.style.width = value === 'fit' ? '' : `${book.pages[current - 1].width * Number(value) / 100}px`;
}
function show(page, navigation = 'push') {
  current = page;
  const entry = book.pages[page - 1];
  const url = new URL(location.href);
  url.searchParams.set('book', book.id); url.searchParams.set('page', String(page));
  if (navigation === 'push') history.pushState(null, '', url);
  if (navigation === 'replace') history.replaceState(null, '', url);
  $('#page').value = String(page);
  $('#prev').disabled = page === 1; $('#next').disabled = page === book.pages.length;
  status.classList.remove('error'); status.textContent = `${page} / ${book.pages.length} · ${entry.title} · 불러오는 중`;
  image.hidden = true;
  image.onload = () => { image.hidden = false; status.textContent = `${page} / ${book.pages.length} · ${entry.title}${entry.kind === 'appendix' ? ' (부록)' : ''}`; };
  image.onerror = () => { status.textContent = '이미지를 불러오지 못했습니다. 새로고침하거나 이미지 원본을 열어 주세요.'; status.classList.add('error'); };
  image.alt = `${book.title} — ${entry.title}`; image.src = entry.image;
  $('#original').href = entry.image; $('#original').hidden = false;
  zoom(); $('#viewport').scrollTo(0, 0);
  document.title = `${book.title} · ${page}페이지`;
}
try {
  const catalog = await readJSON('data/catalog.json');
  const id = new URL(location.href).searchParams.get('book');
  const match = catalog.manuals.find(entry => entry.id === id);
  if (!match) throw new Error('매뉴얼을 찾을 수 없습니다. 매뉴얼 목록에서 게임을 선택해 주세요.');
  book = await readJSON(match.manifest);
  $('#title').textContent = book.title;
  $('#edition').textContent = `${book.platform} · ${book.sourceEdition} 기준 · ${book.pageCount}페이지${book.appendixCount ? ' (부록 포함)' : ''}`;
  $('#page').replaceChildren(...book.pages.map((page, index) => {
    const option = element('option', '', `${index + 1}. ${page.title}${page.kind === 'appendix' ? ' (부록)' : ''}`);
    option.value = String(index + 1); return option;
  }));
  $('#page').disabled = false; $('#zoom').disabled = false;
  $('#prev').onclick = () => { if (current > 1) show(current - 1); };
  $('#next').onclick = () => { if (current < book.pages.length) show(current + 1); };
  $('#page').onchange = event => show(Number(event.target.value));
  $('#zoom').onchange = zoom;
  window.addEventListener('popstate', () => show(requestedPage(), 'none'));
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input,select,textarea,button,[contenteditable]')) return;
    if (event.key === 'ArrowLeft' && current > 1) { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight' && current < book.pages.length) { event.preventDefault(); show(current + 1); }
  });
  show(requestedPage(), 'replace');
} catch (error) { status.textContent = error.message; status.classList.add('error'); }
