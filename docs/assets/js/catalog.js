import { readJSON, element } from './data.js';
import { downloadKoreanZip, megabytes } from './zip.js';
const status = document.querySelector('#status');

// 아카이브와 같은 떠오르는 물방울
const layer = document.querySelector('.bubbles');
const random = (min, max) => min + Math.random() * (max - min);
for (let i = 0; i < 18; i++) {
  const bubble = element('span', 'bubble');
  bubble.style.cssText = `--x:${random(0, 100)}%;--s:${random(20, 96)}px;--d:${random(16, 34)}s;--delay:${-random(0, 34)}s;--sway:${random(14, 46)}px;--w:${random(2.6, 4.6)}s`;
  bubble.append(element('i'));
  layer?.append(bubble);
}

const icon = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>';
  return svg;
};

// 매뉴얼마다 한국어·원본·클린본 zip 받기 버튼을 붙입니다.
// 원본·클린본은 각 매뉴얼 데이터(downloads)의 GitHub 릴리스 주소, 한국어는 사이트의 JPG를 바로 묶습니다.
async function attachFiles(book, node) {
  const files = element('div', 'manual-files');
  files.setAttribute('role', 'group');
  files.setAttribute('aria-label', `${book.title} zip 받기`);
  files.append(icon());
  node.append(files);
  try {
    const manifest = await readJSON(book.manifest);
    const korean = element('button', 'file-btn ko', '한국어');
    korean.type = 'button';
    korean.title = ['한국어', `${manifest.pages.length}장`, 'JPG', manifest.koreanBytes && megabytes(manifest.koreanBytes)].filter(Boolean).join(' · ');
    korean.onclick = async () => {
      if (korean.disabled) return;
      korean.disabled = true;
      try {
        await downloadKoreanZip(manifest, (done, total) => { korean.textContent = `${done}/${total}`; });
        korean.textContent = '한국어';
      } catch (error) {
        korean.textContent = '다시 시도';
        korean.title = error.message;
      } finally { korean.disabled = false; }
    };
    files.append(korean);
    for (const item of manifest.downloads ?? []) {
      const link = element('a', 'file-btn', item.label);
      link.href = item.url;
      link.title = [item.label, `${item.pages}장`, '무손실 PNG', item.bytes && megabytes(item.bytes)].filter(Boolean).join(' · ');
      files.append(link);
    }
  } catch { files.remove(); }
}

function checksums(release) {
  const box = element('div');
  for (const [key, label] of [['source', '원본 ISO'], ['patch', '패치'], ['target', '적용 후 ISO']]) {
    if (!release[key]) continue;
    const p = element('p', 'muted');
    p.append(element('strong', '', `${label}: ${release[key].filename}`), element('br'), element('code', '', `SHA-256 ${release[key].sha256}`));
    box.append(p);
  }
  return box;
}

function section(collection) {
  const node = element('section', 'panel');
  node.id = collection.id;
  node.setAttribute('aria-labelledby', `${collection.id}-heading`);
  const head = element('div', 'panel-head');
  const titles = element('div');
  const heading = element('h2', '', collection.title);
  heading.id = `${collection.id}-heading`;
  titles.append(element('p', 'eyebrow', `${collection.titleEn} · ${collection.platform}`), heading);
  const actions = element('div', 'panel-actions');
  const patch = element('a', 'btn primary', '한국어 패치 받기');
  patch.href = collection.patch;
  const guide = element('a', 'btn', '적용 안내');
  guide.href = collection.guide;
  actions.append(patch, guide);
  head.append(titles, actions);
  const grid = element('div', 'manuals');
  const details = element('details');
  if (collection.id === 'mega') details.id = 'patch';
  details.append(element('summary', '', '원본 및 패치 검증 정보'),
    element('p', 'muted', `${collection.target}에 적용하는 xdelta 패치입니다. 원본 파일의 SHA-256을 확인한 뒤 적용해 주세요.`));
  readJSON(collection.release).then(release => details.append(checksums(release)))
    .catch(() => details.append(element('p', 'muted', '검증 정보는 GitHub 릴리스에서 확인해 주세요.')));
  node.append(head, element('p', 'muted', collection.summary), grid, details);
  return { node, grid };
}

try {
  const catalog = await readJSON('data/catalog.json');
  const sections = catalog.collections.map(collection => ({ collection, ...section(collection) }));
  document.querySelector('#collections').replaceChildren(...sections.map(item => item.node));

  const cards = new Map(catalog.manuals.map(book => {
    const card = element('div', 'manual');
    const link = element('a', 'manual-link');
    link.href = `manual.html?book=${encodeURIComponent(book.id)}&page=1`;
    const cover = element('span', 'manual-cover');
    const image = element('img');
    image.src = book.cover; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
    cover.append(image);
    link.append(cover, element('span', 'manual-title', book.title),
      element('span', 'manual-meta', `${book.platform} · ${book.sourceEdition} · ${book.pageCount}페이지`));
    card.append(link);
    attachFiles(book, card);
    return [book, card];
  }));
  const render = () => {
    const query = document.querySelector('#search').value.trim().toLocaleLowerCase();
    const books = catalog.manuals.filter(book => book.title.toLocaleLowerCase().includes(query));
    for (const { collection, node, grid } of sections) {
      const matches = books.filter(book => (book.collection ?? 'mega') === collection.id);
      grid.replaceChildren(...matches.map(book => cards.get(book)));
      node.hidden = !matches.length;
    }
    status.textContent = books.length ? `${books.length}종의 매뉴얼` : '검색 결과가 없습니다.';
    status.className = books.length ? 'sr-only' : 'panel muted';
  };
  document.querySelector('#search').addEventListener('input', render);
  render();
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) { if (target.tagName === 'DETAILS') target.open = true; requestAnimationFrame(() => target.scrollIntoView()); }
} catch (error) { status.textContent = error.message; status.classList.add('error'); status.classList.remove('sr-only'); }
