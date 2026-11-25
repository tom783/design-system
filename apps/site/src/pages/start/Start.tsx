import * as React from 'react';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, DescriptionList, PageHeader, SectionHeader } from '@s2life/ui';
import { Bot, Code, Palette } from '@s2life/ui/icons';
import docs from 'virtual:site-docs';
import { CodeBlock } from '../../blocks/CodeBlock';
import { Rich, Sources } from '../../blocks/Text';
import { DocLayout, type TocItem } from '../../blocks/Toc';
import { boundary } from '../../content/concept';
import { BoundaryTable } from '../concept/Concept';

/**
 * 시작하기 — 원본은 저장소 README.md 다. 설치 명령·코드는 README 의 코드 블록, 설명 문장은 README 단락을 빌드 때 읽어
 * 그대로 싣는다(vite-plugins/site-docs.ts). 설치 조건의 판은 package.json 에서 읽는다.
 * 사이트가 새로 쓴 글은 세 갈래 안내(어느 페이지로 가는지)뿐이다.
 */
const text = docs.readme.text;
const SECTION = { install: '기본 설치: Tailwind 없이 사용', tailwind: '이미 Tailwind v4를 쓰는 앱', mcp: 'MCP 설치' } as const;

function Paragraphs({ items }: { items: readonly string[] }) {
  return <>{items.map((item, i) => <p key={i}><Rich text={item} /></p>)}</>;
}

/**
 * 설치 조건 단락 — 그 안의 설치 명령(인라인 코드)을 복사 버튼 코드 블록으로 뺀다(검수 r1: 인라인 코드가 한 줄에 몰려 있었다).
 * 문장은 README 그대로 두고 명령 자리만 '아래 명령'으로 바꾸며, 명령이 든 문장 뒤에서 단락을 나눠 그 사이에 코드 블록을 둔다.
 */
function PeerParagraphs({ items, command }: { items: readonly string[]; command: string }) {
  const code = `\`${command}\``;
  return <>{items.map((item, i) => {
    const at = item.indexOf(code);
    if (at < 0) return <p key={i}><Rich text={item} /></p>;
    const stop = item.indexOf('. ', at + code.length);
    const cut = stop < 0 ? item.length : stop + 1;
    const after = item.slice(cut).trim();
    return <React.Fragment key={i}>
      <p><Rich text={item.slice(0, cut).replace(code, '아래 명령')} /></p>
      <CodeBlock label="sh · React·React DOM 함께 설치" code={command} />
      {after && <p><Rich text={after} /></p>}
    </React.Fragment>;
  })}</>;
}

interface Track {
  id: string;
  title: string;
  icon: React.ReactNode;
  steps: { to: string; label: string; detail: string }[];
}

const TRACKS: Track[] = [
  {
    id: 'developer', title: '개발자', icon: <Code aria-hidden="true" />,
    steps: [
      { to: '#requirements', label: '설치 조건', detail: 'React 판과 앱 전체 적용 전제를 확인한다' },
      { to: '#install', label: '기본 설치', detail: '패키지를 설치하고 앱 진입점에서 CSS 두 줄을 불러온다' },
      { to: '/components', label: '부품', detail: '부품 페이지 코드 탭의 가져오기 줄과 Props 를 쓴다' },
    ],
  },
  {
    id: 'designer', title: '디자이너', icon: <Palette aria-hidden="true" />,
    steps: [
      { to: '/concept', label: '디자인 컨셉', detail: '원칙과 결정 이유' },
      { to: '/foundations', label: '파운데이션', detail: '색·활자·간격·형태·모션 토큰 값' },
      { to: '/components', label: '부품', detail: '가이드 탭의 쓰는 때·쓰지 말 것·규칙' },
    ],
  },
  {
    id: 'ai', title: 'AI', icon: <Bot aria-hidden="true" />,
    steps: [
      { to: '#mcp', label: 'MCP 연결', detail: '명령 한 줄로 MCP 서버를 연결한다' },
      { to: '/ai', label: 'AI로 쓰기', detail: 'AI가 받는 안내·도구·리소스와 질문→추천 예시' },
    ],
  },
];

function TrackCard({ track }: { track: Track }) {
  return <Card>
    <CardHeader><CardTitle><span className="site-icon-label">{track.icon}{track.title}</span></CardTitle></CardHeader>
    <CardBody>
      <ol className="site-list site-list-ordered">
        {track.steps.map((step) => <li key={step.label}>
          {step.to.startsWith('#')
            ? <Link className="site-link" to={{ hash: step.to.slice(1) }}>{step.label}</Link>
            : <Link className="site-link" to={step.to}>{step.label}</Link>}
          <span className="site-muted"> — {step.detail}</span>
        </li>)}
      </ol>
    </CardBody>
  </Card>;
}

const TOC: TocItem[] = [
  { id: 'tracks', label: '어디서 시작하나' },
  { id: 'requirements', label: '설치 조건' },
  { id: 'install', label: SECTION.install },
  { id: 'tailwind', label: SECTION.tailwind },
  { id: 'mcp', label: SECTION.mcp },
  { id: 'boundary', label: '디자인 시스템이 정하지 않는 것' },
];

export function StartPage() {
  const req = docs.requirements;
  return <DocLayout toc={TOC}>
    <PageHeader title="시작하기" description={<Rich text={text.intro[0]!} />} />
    <SectionHeader id="tracks" title="어디서 시작하나">
      <div className="site-card-grid">
        {TRACKS.map((track) => <TrackCard key={track.id} track={track} />)}
      </div>
    </SectionHeader>
    <SectionHeader id="requirements" title="설치 조건">
      <div className="site-stack">
        <DescriptionList labelWidth={10} items={[
          { label: 'React · React DOM', value: req.react && <span>
            <code className="site-code">react {req.react}</code> · <code className="site-code">react-dom {req.reactDom}</code> (peer 의존성)
          </span> },
          { label: 'Node.js', value: req.node && <code className="site-code">{req.node}</code> },
          { label: '적용 범위', value: <strong>앱 전체</strong> },
        ]} />
        <PeerParagraphs items={text.peer} command={docs.readme.peerInstall} />
        <Paragraphs items={text.appWide} />
        <Sources items={[{ readme: SECTION.install }, { text: 'packages/ui·packages/mcp package.json' }]} />
      </div>
    </SectionHeader>
    <SectionHeader id="install" title={SECTION.install}>
      <div className="site-stack">
        <CodeBlock label="sh" code={docs.readme.install} />
        <Paragraphs items={text.entryCss} />
        <CodeBlock label="tsx · 앱 진입점" code={docs.readme.entry} />
        <Paragraphs items={text.font} />
        <Paragraphs items={text.standalone} />
        <Paragraphs items={text.utilities} />
        <Sources items={[{ readme: SECTION.install }]} />
      </div>
    </SectionHeader>
    <SectionHeader id="tailwind" title={SECTION.tailwind}>
      <div className="site-stack">
        <Paragraphs items={text.tailwindIntro} />
        <CodeBlock label="css · src/app.css" code={docs.readme.tailwind} />
        <Paragraphs items={text.tailwindEntry} />
        <Sources items={[{ readme: SECTION.tailwind }]} />
      </div>
    </SectionHeader>
    <SectionHeader id="mcp" title={SECTION.mcp}>
      <div className="site-stack">
        <CodeBlock label="sh" code={docs.readme.mcp} />
        <Paragraphs items={text.mcpCli} />
        <p><Link className="site-link" to="/ai">AI로 쓰기</Link> — 서버가 AI에게 주는 안내·도구·리소스와 질문→추천 예시</p>
        <Sources items={[{ readme: SECTION.mcp }]} />
      </div>
    </SectionHeader>
    <SectionHeader id="boundary" title="디자인 시스템이 정하지 않는 것" description={<span><Link className="site-link" to="/concept#boundary">디자인 컨셉</Link>의 같은 표 — {boundary.title}</span>}>
      <BoundaryTable />
    </SectionHeader>
  </DocLayout>;
}
