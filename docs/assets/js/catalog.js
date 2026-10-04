import { readJSON, element } from './data.js';
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

// 작업용 원본·클린본 zip은 각 매뉴얼 데이터(downloads)에 있어서 목록을 그린 뒤 따로 붙입니다.
async function attachFiles(book, node) {
  try {
    const manifest = await readJSON(book.manifest);
    if (!manifest.downloads?.length) return;
    const files = element('div', 'manual-files');
    for (const item of manifest.downloads) {
      const link = element('a', 'btn small', `${item.label} zip`);
      link.href = item.url;
      link.title = `${item.label} ${item.pages}장 · 무손실 PNG`;
      files.append(link);
    }
    node.append(files);
  } catch { /* 받기 버튼 없이 표시합니다 */ }
}

try {
  const catalog = await readJSON('data/catalog.json');
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
    const mega = books.filter(book => !book.collection), gems = books.filter(book => book.collection === 'gems');
    document.querySelector('#catalog').replaceChildren(...mega.map(book => cards.get(book)));
    document.querySelector('#gems-catalog').replaceChildren(...gems.map(book => cards.get(book)));
    document.querySelector('#mega').hidden = !mega.length;
    document.querySelector('#gems').hidden = !gems.length;
    status.textContent = books.length ? `${books.length}종의 매뉴얼` : '검색 결과가 없습니다.';
    status.className = books.length ? 'sr-only' : 'panel muted';
  };
  document.querySelector('#search').addEventListener('input', render);
  render();
} catch (error) { status.textContent = error.message; status.classList.add('error'); status.classList.remove('sr-only'); }

try {
  const release = await readJSON('data/release.json');
  for (const [key, label] of [['source', '원본 ISO'], ['patch', '패치'], ['target', '적용 후 ISO']]) {
    const p = element('p', 'muted');
    p.append(element('strong', '', `${label}: ${release[key].filename}`), element('br'), element('code', '', `SHA-256 ${release[key].sha256}`));
    document.querySelector('#checksums').append(p);
  }
} catch { document.querySelector('#checksums').textContent = '검증 정보는 GitHub 릴리스에서 확인해 주세요.'; }
