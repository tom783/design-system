// 저장소 마크다운(README·DESIGN.md)에서 사이트가 쓰는 조각을 읽는다 — 문서를 사이트로 손으로 옮겨 적지 않는다.
// 펜스 코드 안의 `#` 줄(셸 주석)은 제목이 아니다.

export interface Heading {
  level: number;
  /** 마크다운 꾸밈을 뗀 제목 글 */
  text: string;
  /** GitHub 이 붙이는 앵커 — github-slugger 와 같은 규칙(소문자, 글자·숫자·_·-·공백만 남기고 공백→-, 겹치면 -1·-2) */
  slug: string;
}

export interface CodeBlock {
  /** 이 블록이 든 가장 가까운 제목 글 */
  section: string;
  lang: string;
  code: string;
}

/** 빈 줄로 나뉜 글 덩어리. 목록이면 항목마다, 단락이면 줄을 이어 한 문자열(마크다운 줄바꿈 = 띄어쓰기). */
export interface TextBlock {
  section: string;
  kind: 'paragraph' | 'list';
  items: string[];
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w-]*)/;

function plain(text: string) {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim();
}

function githubSlug(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
}

/** 문서의 제목과 코드 블록을 한 번에 읽는다. */
export function parseMarkdown(markdown: string): { headings: Heading[]; blocks: CodeBlock[]; texts: TextBlock[] } {
  const headings: Heading[] = [];
  const blocks: CodeBlock[] = [];
  const texts: TextBlock[] = [];
  const occurrences = new Map<string, number>();
  let fence: { mark: string; lang: string; lines: string[] } | null = null;
  let section = '';
  let text: TextBlock | null = null;
  const LIST_ITEM = /^\s{0,3}(?:\d+\.|[-*])\s+(.*)$/;
  for (const line of markdown.split('\n')) {
    const open = FENCE.exec(line);
    const plainLine = !fence && !open && !/^#{1,6}\s/.test(line) && !/^\s*(?:>|\||---\s*$)/.test(line);
    if (plainLine && line.trim()) {
      const item = LIST_ITEM.exec(line);
      if (item) {
        if (text?.kind !== 'list') { text = { section, kind: 'list', items: [] }; texts.push(text); }
        text.items.push(item[1]!.trim());
      } else if (text) {
        text.items[text.items.length - 1] += ` ${line.trim()}`;
      } else {
        text = { section, kind: 'paragraph', items: [line.trim()] };
        texts.push(text);
      }
      continue;
    }
    text = null;
    if (fence) {
      if (open && open[1]![0] === fence.mark[0] && open[1]!.length >= fence.mark.length && !open[2]) {
        blocks.push({ section, lang: fence.lang, code: fence.lines.join('\n') });
        fence = null;
      } else {
        fence.lines.push(line);
      }
      continue;
    }
    if (open) { fence = { mark: open[1]!, lang: open[2] ?? '', lines: [] }; continue; }
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const title = plain(heading[2]!);
    const base = githubSlug(title);
    let slug = base;
    while (occurrences.has(slug)) {
      const count = occurrences.get(base)! + 1;
      occurrences.set(base, count);
      slug = `${base}-${count}`;
    }
    occurrences.set(slug, 0);
    headings.push({ level: heading[1]!.length, text: title, slug });
    section = title;
  }
  return { headings, blocks, texts };
}

/**
 * 제목 `section` 아래에서 `startsWith` 로 시작하는 글 덩어리. 없으면 빌드를 멈춘다 — 문장을 사이트로 옮겨 적지 않고
 * 문서에서 바로 읽되, 문서가 바뀌어 다른 단락을 보이는 일은 없게.
 */
export function textIn(file: string, parsed: { texts: TextBlock[] }, section: string, startsWith: string): TextBlock {
  const found = parsed.texts.find((block) => block.section === section && block.items[0]!.startsWith(startsWith));
  if (!found) throw new Error(`소개 사이트: ${file} 의 '${section}' 아래 '${startsWith}…' 로 시작하는 글이 없다 — 문서가 바뀌었으면 apps/site/vite-plugins 를 함께 고친다.`);
  return found;
}

/** 제목 `section` 아래 `lang` 코드 블록(n번째). 없으면 빌드를 멈춘다 — 문서가 바뀌었는데 사이트가 옛 글을 보이지 않게. */
export function codeIn(file: string, parsed: { blocks: CodeBlock[] }, section: string, lang: string, index = 0): string {
  const found = parsed.blocks.filter((block) => block.section === section && block.lang === lang)[index];
  if (!found) throw new Error(`소개 사이트: ${file} 의 '${section}' 아래 ${lang} 코드 블록(${index + 1}번째)이 없다 — 문서 제목·블록이 바뀌었으면 apps/site/vite-plugins 를 함께 고친다.`);
  return found.code;
}

/** 번호 붙은 절('2.3') → 제목·앵커. 같은 번호가 둘이면 앞의 것. */
export function numberedSections(headings: Heading[]) {
  const sections: Record<string, { title: string; slug: string }> = {};
  for (const heading of headings) {
    const match = /^(\d+(?:\.\d+)*)\.?\s+(.+)$/.exec(heading.text);
    if (match && heading.level >= 2) sections[match[1]!] ??= { title: match[2]!.trim(), slug: heading.slug };
  }
  return sections;
}
