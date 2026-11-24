import { DescriptionList, PageHeader } from '@s2life/ui';
import meta from 'virtual:site-meta';
import { componentCount, components, manifest } from '../data/manifest';
import { Pending } from './Placeholder';

/**
 * 첫 화면. 문안·시각 방향은 디자인 총괄 결과(11/27) 뒤에 채운다.
 * 지금은 데이터로 정해지는 것(부품 수·토큰 수·버전)만 싣는다.
 */
export function HomePage() {
  return <div className="site-page">
    <PageHeader title="@s2life 디자인 시스템" />
    <DescriptionList columns={2} items={[
      { label: '부품', value: <span className="tabular">{componentCount}개 (부분까지 공개 이름 {components.length}개)</span> },
      { label: '토큰', value: <span className="tabular">{manifest.tokens.length}개</span> },
      { label: '버전(이 작업 폴더)', value: <span className="tabular">{meta.version}{meta.sha ? ` · ${meta.sha}${meta.dirty ? ' (수정됨)' : ''}` : ''}</span> },
      { label: 'npm 게시판', value: <span className="tabular">{meta.published ? `${meta.published.version} (${meta.published.date})` : '없음'}</span> },
    ]} />
    <Pending who="첫 화면 문안과 시각 방향은 디자인 총괄 결과(11/27) 뒤에 채운다." />
  </div>;
}

/** 자리만 둔 메뉴 — 문안은 다음 단계에서 채운다. 지금 원본 문서가 있으면 그쪽으로 안내한다. */
function PendingMenu({ title, who, source }: { title: string; who: string; source?: { label: string; path: string } }) {
  return <div className="site-page">
    <PageHeader title={title} />
    <Pending who={who} />
    {source && meta.repository && <p className="site-caption">
      지금 원본: <a className="site-link" href={`${meta.repository}/blob/main/${source.path}`} target="_blank" rel="noreferrer">{source.label}</a>
    </p>}
  </div>;
}

export function StartPage() {
  return <PendingMenu title="시작하기" who="문안은 다음 단계에서 채운다." source={{ label: 'README.md', path: 'README.md' }} />;
}

export function ConceptPage() {
  return <PendingMenu title="디자인 컨셉" who="디자인 컨셉 문안과 시각 방향은 디자인 총괄 결과(11/27) 뒤에 채운다." />;
}

export function AiPage() {
  return <PendingMenu title="AI로 쓰기" who="문안은 다음 단계에서 채운다." source={{ label: 'packages/mcp/README.md', path: 'packages/mcp/README.md' }} />;
}

export function NotFoundPage() {
  return <div className="site-page">
    <PageHeader title="없는 페이지" />
  </div>;
}
