export function normalize(str: string) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/<.+>/g, '')
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function slugify(text: string) {
  return normalize(text)
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/-$/g, '');
}
