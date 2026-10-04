export async function readJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다 (${response.status}).`);
  return response.json();
}
export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
