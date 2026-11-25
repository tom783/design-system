import * as React from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * 목차("이 페이지에서") — 사이트 전용(디자인 시스템 부품 후보로 올리지 않는다 — 개발 총괄 결정).
 * - 항목은 페이지가 그리는 섹션 목록과 같은 데이터에서 만든다(목차만 따로 적지 않는다). id 는 SectionHeader 의 section id.
 * - 지금 읽는 섹션은 aria-current + 굵기 600 + 왼쪽 선 색으로 함께 표시한다(색만으로 알리지 않는다, DESIGN.md 6.1 현재 위치).
 * - 문서(창)가 스크롤한다(사이트 틀 A — 전에는 AppShell 본문 칸).
 * - 배치: 그릇이 넓을 때만 본문 오른쪽에 붙어 따라온다(site.css .site-doc). 좁으면 숨긴다 — 본문 섹션 제목이 그대로 있다.
 */
export interface TocItem {
  id: string;
  label: string;
  /** 3 이면 한 단계 들여 쓴다(섹션 안의 섹션). */
  depth?: 2 | 3;
}

/** 화면 위에서 이 높이(px — 상단 바 64 + 96)까지 올라온 마지막 섹션이 "지금 읽는 섹션"이다. */
const READ_LINE = 64 + 96;

function useCurrentSection(ids: readonly string[]) {
  const [current, setCurrent] = React.useState<string | undefined>(ids[0]);
  const key = ids.join('\n');
  React.useEffect(() => {
    if (ids.length === 0) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      const present = ids.filter((id) => document.getElementById(id));
      let next = present[0];
      for (const id of present) if (document.getElementById(id)!.getBoundingClientRect().top <= READ_LINE) next = id;
      // 끝까지 내렸으면 마지막 섹션(짧은 마지막 섹션은 읽는 선을 넘지 못한다).
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= root.scrollHeight - 1) next = present.at(-1);
      setCurrent(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', schedule);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
    // ids 는 key(이름 목록)로 비교한다 — 배열 정체성은 렌더마다 바뀐다.
  }, [key]);
  return current;
}

export function Toc({ items, label = '이 페이지에서' }: { items: readonly TocItem[]; label?: string }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const current = useCurrentSection(items.map((item) => item.id));
  const headingId = `${React.useId()}-toc`;
  if (items.length === 0) return null;
  return <nav className="site-toc" aria-labelledby={headingId}>
    <p id={headingId} className="site-toc-title">{label}</p>
    <ol className="site-toc-list">
      {items.map((item) => <li key={item.id}>
        <a className="site-toc-link" href={`${search}#${encodeURIComponent(item.id)}`} data-depth={item.depth ?? 2}
          aria-current={current === item.id ? 'location' : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            document.getElementById(item.id)?.scrollIntoView();
            // 주소에도 남긴다(공유·새로 고침). 같은 해시를 다시 눌러도 위에서 직접 옮겼으므로 된다.
            navigate({ search, hash: item.id }, { replace: true });
          }}>
          {item.label}
        </a>
      </li>)}
    </ol>
  </nav>;
}

/** 본문 + 오른쪽 목차. 목차는 넓은 그릇에서만 보인다. */
export function DocLayout({ toc, children }: { toc: readonly TocItem[]; children: React.ReactNode }) {
  return <div className="site-doc">
    <div className="site-doc-grid">
      <div className="site-page">{children}</div>
      <aside className="site-doc-toc"><Toc items={toc} /></aside>
    </div>
  </div>;
}
