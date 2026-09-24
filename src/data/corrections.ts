import { Work } from '../types';

export const TANGDUOLING_LINES = [
  '\u82a6\u53f6\u6ee1\u6c40\u6d32\uff0c',
  '\u5bd2\u6c99\u5e26\u6d45\u6d41\u3002',
  '\u4e8c\u5341\u5e74\u3001\u91cd\u8fc7\u5357\u697c\u3002',
  '\u67f3\u4e0b\u7cfb\u8239\u72b9\u672a\u7a33\uff0c',
  '\u80fd\u51e0\u65e5\u3001\u53c8\u4e2d\u79cb\u3002',
  '\u9ec4\u9e64\u65ad\u77f6\u5934\uff0c',
  '\u6545\u4eba\u4eca\u5728\u5426\uff1f',
  '\u65e7\u6c5f\u5c71\uff0c',
  '\u6d51\u662f\u65b0\u6101\u3002',
  '\u6b32\u4e70\u6842\u82b1\u540c\u8f7d\u9152\uff0c',
  '\u7ec8\u4e0d\u4f3c\u3001\u5c11\u5e74\u6e38\u3002',
];

export const JIANGCHENGZI_LINES = [
  '\u5341\u5e74\u751f\u6b7b\u4e24\u832b\u832b\uff0c',
  '\u4e0d\u601d\u91cf\uff0c\u81ea\u96be\u5fd8\u3002',
  '\u5343\u91cc\u5b64\u575f\uff0c\u65e0\u5904\u8bdd\u51c4\u51c9\u3002',
  '\u7eb5\u4f7f\u76f8\u9022\u5e94\u4e0d\u8bc6\uff0c\u5c18\u6ee1\u9762\uff0c\u9b13\u5982\u971c\u3002',
  '\u591c\u6765\u5e7d\u68a6\u5ffd\u8fd8\u4e61\uff0c\u5c0f\u8f69\u7a97\uff0c\u6b63\u68b3\u5986\u3002',
  '\u76f8\u987e\u65e0\u8a00\uff0c\u60df\u6709\u6cea\u5343\u884c\u3002',
  '\u6599\u5f97\u5e74\u5e74\u80a0\u65ad\u5904\uff0c\u660e\u6708\u591c\uff0c\u77ed\u677e\u5188\u3002',
];

export const CORRECTED_WORKS: Work[] = [
  {
    id: 'tangduoling-liuguo',
    title: '\u5510\u591a\u4ee4',
    author: '\u5218\u8fc7',
    dynasty: '\u5b8b',
    genre: '\u8bcd',
    collections: ['\u5b8b\u8bcd', '\u5168\u5b8b\u8bcd'],
    themes: ['\u79cb\u65e5', '\u6000\u65e7', '\u6545\u4eba'],
    moods: ['\u6000\u65e7', '\u60ca\u60a3'],
    intro: '\u91cd\u8fc7\u5357\u697c\uff0c\u611f\u65e7\u6000\u4eba\u3002',
    source: '\u300a\u5168\u5b8b\u8bcd\u300b\u901a\u884c\u6587\u672c\u6821\u8ba2',
    lines: TANGDUOLING_LINES,
    translations: [],
    glossary: [],
  },
];

function chineseOnly(value: string): string {
  return value.replace(/[^\u3400-\u9fff]/g, '');
}

export function normalizeWorkTitle(value: string): string {
  const parts = value.split(/[\u00b7\u30fb]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2) {
    const left = parts[0].replace(/[\s\u00b7\u30fb]/g, '').replace(/\u7cd6/g, '\u5510');
    const right = parts[1].replace(/[\s\u00b7\u30fb]/g, '').replace(/\u7cd6/g, '\u5510');
    if (left === right) return right;
  }
  return value
    .trim()
    .replace(/[\s\u00b7\u30fb]/g, '')
    .replace(/\u7cd6/g, '\u5510');
}

export function canonicalWorkKey(work: Work): string {
  const opening = chineseOnly(work.lines.slice(0, 2).join('')).slice(0, 12);
  return `${normalizeWorkTitle(work.title)}|${work.author.trim()}|${opening}`;
}

export function correctKnownImportedWork(work: Work): Work {
  let next = { ...work };
  const titleKey = normalizeWorkTitle(next.title);
  const opening = chineseOnly(next.lines.slice(0, 2).join(''));

  if (
    (titleKey.includes('\u6c5f\u57ce\u5b50') || titleKey.includes('\u6c5f\u795e\u5b50'))
    && next.author.trim() === '\u82cf\u8f7c'
    && opening.includes('\u5341\u5e74\u751f\u6b7b')
  ) {
    return {
      ...next,
      title: '\u6c5f\u57ce\u5b50\u00b7\u4e59\u536f\u6b63\u6708\u4e8c\u5341\u65e5\u591c\u8bb0\u68a6',
      author: '\u82cf\u8f7c',
      dynasty: next.dynasty || '\u5b8b',
      genre: '\u8bcd',
      collections: Array.from(new Set([...next.collections, '\u5b8b\u8bcd', '\u5b8b\u8bcd\u4e09\u767e\u9996'])),
      themes: Array.from(new Set([...next.themes, '\u60bc\u4ea1', '\u601d\u5ff5'])),
      moods: next.moods.length ? next.moods : ['\u54c0\u5a49'],
      lines: JIANGCHENGZI_LINES,
      source: '\u6821\u8ba2\u7248 \u00b7 \u82cf\u8f7c\u300a\u6c5f\u57ce\u5b50\u300b',
    };
  }

  if (
    titleKey.includes('\u5510\u591a\u4ee4')
    && next.author.trim() === '\u5218\u8fc7'
    && opening.includes('\u82a6\u53f6\u6ee1\u6c40\u6d32')
  ) {
    return {
      ...next,
      title: '\u5510\u591a\u4ee4',
      author: '\u5218\u8fc7',
      dynasty: next.dynasty || '\u5b8b',
      genre: '\u8bcd',
      collections: Array.from(new Set([...next.collections, '\u5b8b\u8bcd', '\u5168\u5b8b\u8bcd'])),
      themes: Array.from(new Set([...next.themes, '\u79cb\u65e5', '\u6000\u65e7'])),
      moods: next.moods.length ? next.moods : ['\u6000\u65e7'],
      lines: TANGDUOLING_LINES,
      source: '\u6821\u8ba2\u7248 \u00b7 \u300a\u5168\u5b8b\u8bcd\u300b\u901a\u884c\u6587\u672c',
    };
  }

  const titleParts = next.title.split(/[\u00b7\u30fb]/).map((part) => part.trim()).filter(Boolean);
  if (titleParts.length === 2 && normalizeWorkTitle(titleParts[0]) === normalizeWorkTitle(titleParts[1])) {
    next = { ...next, title: titleParts[1] };
  } else if (next.title.includes('\u7cd6')) {
    next = { ...next, title: next.title.replace(/\u7cd6/g, '\u5510').replace(/[\u00b7\u30fb]\u5510\u591a\u4ee4$/, '') };
  }

  const replacements: Array<[string, string]> = [
    ['\u6545\u4eba\u4eca\u4e0d\u5728', '\u6545\u4eba\u4eca\u5728\u5426'],
    ['\u585e\u6c99\u5e26\u6d45\u6d41', '\u5bd2\u6c99\u5e26\u6d45\u6d41'],
    ['\u67f3\u4e0b\u7cfb\u821f\u72b9\u672a\u7a33', '\u67f3\u4e0b\u7cfb\u8239\u72b9\u672a\u7a33'],
  ];

  return {
    ...next,
    lines: next.lines.map((line) => replacements.reduce(
      (current, [from, to]) => current.replace(from, to),
      line,
    )),
  };
}
