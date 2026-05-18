export function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (text.match(/[a-zA-Z]+/g) || []).length;
  return cjk + en;
}

export function countCjkChars(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}
