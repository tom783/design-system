import * as React from 'react';
import meta from 'virtual:site-meta';
import docs from 'virtual:site-docs';

const blob = (path: string, anchor?: string) => meta.repository ? `${meta.repository}/blob/main/${path}${anchor ? `#${anchor}` : ''}` : null;

/**
 * 문안 글의 꾸밈 세 가지만 읽는다 — `**굵게**`, `` `코드` ``, `[글](주소)`. 문안(디자인 총괄 초안·README 단락)의 표기를
 * 그대로 두고 여기서 그린다(문장을 사이트용으로 다시 쓰지 않는다). 상대 주소는 그 문서 폴더(base) 기준 저장소 파일이다.
 */
export function Rich({ text, base = '' }: { text: string; base?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g).filter(Boolean);
  return <>{parts.map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}><Rich text={part.slice(2, -2)} base={base} /></strong>;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={i} className="site-code">{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const target = link[2]!;
      const href = /^[a-z]+:/i.test(target) ? target : blob(`${base}${target}`.replace(/(^|\/)\.\//g, '$1'));
      return <External key={i} href={href}>{link[1]}</External>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  })}</>;
}

function External({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <span>{children}</span>;
  return <a className="site-link" href={href} target="_blank" rel="noreferrer">{children}</a>;
}

/** DESIGN.md 절 링크 — 이름·앵커는 DESIGN.md 제목에서 읽는다(vite.config.ts siteMeta). 없는 절이면 그리지 않고 오류를 낸다. */
export function DesignLink({ section }: { section: string }) {
  const title = meta.designSections[section];
  if (!title) throw new Error(`DESIGN.md 에 ${section} 절이 없다`);
  return <External href={blob('DESIGN.md', meta.designAnchors[section])}>DESIGN.md {section} {title}</External>;
}

/** README 의 제목 링크. 제목은 README 에서 읽은 목록에 있어야 한다. */
export function ReadmeLink({ file = 'README.md', heading, children }: { file?: 'README.md' | 'packages/mcp/README.md'; heading?: string; children?: React.ReactNode }) {
  const headings = file === 'README.md' ? docs.readme.headings : docs.mcpReadme.headings;
  const found = heading ? headings.find((item) => item.text === heading) : undefined;
  if (heading && !found) throw new Error(`${file} 에 '${heading}' 제목이 없다`);
  return <External href={blob(file, found?.slug)}>{children ?? (heading ? `${file} ${heading}` : file)}</External>;
}

/**
 * 문안의 출처 괄호를 대신하는 근거 줄 — 절 끝에 둔다(설명이 먼저, 원문 링크는 끝, 검수 r1).
 * DESIGN.md 절은 그 절로 가는 링크, README 는 그 파일(제목이 있으면 그 제목)로 가는 링크, 덧붙인 말(note)은 문안 그대로.
 */
export type Source =
  | { design: string; note?: string }
  | { readme: string; file?: 'README.md' | 'packages/mcp/README.md'; note?: string }
  | { file: 'README.md' | 'packages/mcp/README.md'; note?: string }
  | { text: string };

export function Sources({ items }: { items: readonly Source[] }) {
  return <p className="site-caption">
    근거 ·{' '}
    {items.map((item, i) => <React.Fragment key={i}>
      {i > 0 && ' · '}
      {'design' in item ? <><DesignLink section={item.design} />{item.note ? ` ${item.note}` : ''}</>
        : 'readme' in item ? <><ReadmeLink file={item.file} heading={item.readme}>{item.file ?? 'README.md'}</ReadmeLink>{item.note ? ` ${item.note}` : ''}</>
          : 'file' in item ? <><ReadmeLink file={item.file}>{item.file}</ReadmeLink>{item.note ? ` ${item.note}` : ''}</>
            : item.text}
    </React.Fragment>)}
  </p>;
}
