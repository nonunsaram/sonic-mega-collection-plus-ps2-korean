import { readJSON, element } from './data.js';
const status = document.querySelector('#status');
try {
  const catalog = await readJSON('data/catalog.json');
  const render = () => {
    const query = document.querySelector('#search').value.trim().toLocaleLowerCase();
    const books = catalog.manuals.filter(book => book.title.toLocaleLowerCase().includes(query));
    document.querySelector('#catalog').replaceChildren(...books.map(book => {
      const card = element('a', 'card');
      card.href = `manual.html?book=${encodeURIComponent(book.id)}&page=1`;
      const cover = element('div', 'cover');
      const image = element('img');
      image.src = book.cover; image.alt = ''; image.loading = 'lazy';
      cover.append(image);
      const body = element('div', 'card-body');
      body.append(element('h3', '', book.title), element('p', '', `${book.platform} · ${book.sourceEdition}`), element('p', '', `${book.pageCount}페이지${book.appendixCount ? ` · 부록 ${book.appendixCount}페이지 포함` : ''}`), element('p', 'read-link', '매뉴얼 읽기 →'));
      card.append(cover, body); return card;
    }));
    status.textContent = books.length ? `${books.length}종의 매뉴얼` : '검색 결과가 없습니다.';
  };
  document.querySelector('#search').addEventListener('input', render);
  render();
} catch (error) { status.textContent = error.message; status.classList.add('error'); }
try {
  const release = await readJSON('data/release.json');
  for (const [key, label] of [['source', '원본 ISO'], ['patch', '패치'], ['target', '적용 후 ISO']]) {
    const p = element('p');
    p.append(element('strong', '', `${label}: ${release[key].filename}`), element('br'), element('code', '', `SHA-256 ${release[key].sha256}`));
    document.querySelector('#checksums').append(p);
  }
} catch { document.querySelector('#checksums').textContent = '검증 정보는 GitHub 릴리스에서 확인해 주세요.'; }
