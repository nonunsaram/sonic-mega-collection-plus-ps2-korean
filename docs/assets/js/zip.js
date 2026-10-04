import { element } from './data.js';

// 한국어 페이지는 사이트에 있는 JPG를 브라우저에서 바로 묶어 zip으로 받습니다.
// (원본·클린본 zip은 GitHub 릴리스에 따로 올라가 있습니다.)
let zipLibrary;
function loadZip() {
  zipLibrary ??= new Promise((resolve, reject) => {
    const script = element('script');
    script.src = new URL('../vendor/jszip.min.js', import.meta.url).href;
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => { zipLibrary = null; reject(new Error('압축 도구를 불러오지 못했습니다.')); };
    document.head.append(script);
  });
  return zipLibrary;
}

// 받는 파일 이름은 일부 환경에서 한글이 깨지므로 영문 ID로 만듭니다.
export const pageFileName = (book, index) => `${String(index + 1).padStart(3, '0')}.${book.pages[index].image.split('.').pop()}`;

export async function downloadKoreanZip(book, onProgress = () => {}) {
  const name = `${book.id}-ko`;
  const JSZip = await loadZip();
  const zip = new JSZip();
  const folder = zip.folder(name);
  let done = 0;
  // 이미 압축된 이미지라 다시 압축하지 않고 그대로 담습니다.
  await Promise.all(book.pages.map(async (entry, index) => {
    const response = await fetch(entry.image);
    if (!response.ok) throw new Error(`${index + 1}페이지를 받지 못했습니다.`);
    folder.file(pageFileName(book, index), await response.blob(), { binary: true });
    onProgress(++done, book.pages.length);
  }));
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const link = element('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  return `${name}.zip`;
}

export const megabytes = bytes => `${Math.max(1, Math.round(bytes / 1048576))}MB`;
