import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, DescriptionList, PageHeader, SectionHeader } from '@s2life/ui';
import docs, { type McpCandidate, type McpResource, type McpTool, type McpToolParam } from 'virtual:site-docs';
import meta from 'virtual:site-meta';
import { CodeBlock } from '../../blocks/CodeBlock';
import { Rich, Sources } from '../../blocks/Text';
import { DocLayout, type TocItem } from '../../blocks/Toc';
import { pageFor } from '../../data/manifest';

/**
 * AI로 쓰기 — 원본은 packages/mcp/README.md 와 MCP 서버 자신이다.
 * - 연결 명령·설정·설명 문장: README 코드 블록·단락을 빌드 때 읽는다.
 * - 안내(instructions)·도구·리소스·추천 예시: 빌드 때 server.mjs 를 실제로 띄워 받은 응답(vite-plugins/site-docs.ts).
 *   서버 정의를 사이트에 옮겨 적지 않으므로, 도구가 바뀌면 이 페이지도 같이 바뀐다.
 */
const mcp = docs.mcp;
const text = docs.mcpReadme.text;
const MCP_README = 'packages/mcp/README.md' as const;

function ComponentName({ name }: { name: string }) {
  const page = pageFor(name);
  if (!page) return <code className="site-code">{name}</code>;
  const to = page.name === name ? `/components/${name}` : `/components/${page.name}?tab=code#part-${name}`;
  return <Link className="site-link" to={to}>{name}</Link>;
}

function ParamList({ params }: { params: McpToolParam[] }) {
  if (params.length === 0) return <span className="site-muted">없음</span>;
  return <ul className="site-list">
    {params.map((param) => <li key={param.name}>
      <code className="site-code">{param.name}</code>{param.required ? ' (필수)' : ''}
      {param.enum && <span className="site-muted"> — {param.enum.join(' · ')}</span>}
      {param.range && <span className="site-muted tabular"> — {param.range[0]}~{param.range[1]}</span>}
    </li>)}
  </ul>;
}

// 도구·리소스·추천 근거는 문장이 길다 — 줄바꿈하지 않는 데이터 표 대신 카드·목록으로 둔다(좁은 폭에서도 가로로 밀지 않게).
function ToolCard({ tool }: { tool: McpTool }) {
  return <Card>
    <CardHeader><CardTitle><code className="site-code">{tool.name}</code> {tool.title}</CardTitle></CardHeader>
    <CardBody>
      <div className="site-stack-sm">
        <p>{tool.description}</p>
        <div className="site-caption">인자</div>
        <ParamList params={tool.params} />
      </div>
    </CardBody>
  </Card>;
}

function ResourceCard({ resource }: { resource: McpResource }) {
  return <Card>
    <CardHeader><CardTitle><code className="site-code">{resource.uri}</code> {resource.title}</CardTitle></CardHeader>
    <CardBody>
      <div className="site-stack-sm">
        <p>{resource.description}</p>
        <p className="site-caption">형식 <code className="site-code">{resource.mimeType}</code></p>
      </div>
    </CardBody>
  </Card>;
}

function Candidates({ candidates }: { candidates: McpCandidate[] }) {
  return <ol className="site-list site-list-ordered">
    {candidates.map((candidate) => <li key={candidate.name}>
      <span className="site-stack-sm">
        <span><ComponentName name={candidate.name} /> <span className="site-muted tabular">점수 {candidate.score}</span></span>
        <span className="site-caption">{candidate.reasons.join(' · ')}</span>
      </span>
    </li>)}
  </ol>;
}

const TOC: TocItem[] = [
  { id: 'connect', label: '연결 한 줄' },
  { id: 'develop', label: '저장소에서 개발할 때' },
  { id: 'instructions', label: 'AI가 받는 안내' },
  { id: 'tools', label: `도구 ${mcp.tools.length}개` },
  { id: 'resources', label: `리소스 ${mcp.resources.length}개` },
  { id: 'examples', label: '질문 → 추천 예시' },
  ...mcp.examples.map((_, i) => ({ id: `example-${i + 1}`, label: `질문 ${i + 1}`, depth: 3 as const })),
];

export function AiPage() {
  return <DocLayout toc={TOC}>
    <PageHeader title="AI로 쓰기" description={<Rich text={text.intro[0]!} base="packages/mcp/" />} />
    {/* 절마다 설명이 먼저, 원문 링크는 절 끝 '근거 ·' 줄(디자인 컨셉과 같은 모양, 검수 r1). */}
    <SectionHeader id="connect" title="연결 한 줄">
      <div className="site-stack">
        <p><Rich text={text.connect[0]!} base="packages/mcp/" /></p>
        <CodeBlock label="sh" code={docs.mcpReadme.connect} />
        <p><Rich text={text.npx[0]!} base="packages/mcp/" /></p>
        {meta.published && <p className="site-caption tabular">
          npx 는 npm 게시판 {meta.published.version}({meta.published.date})을 받는다. 이 사이트는 작업 폴더 {meta.version} 기준이다 —
          게시판 뒤에 더한 부품은 게시 전까지 npx로 연결한 AI가 받지 못한다(부품 페이지의 npm 표시).
        </p>}
        <Sources items={[{ file: MCP_README }]} />
      </div>
    </SectionHeader>
    <SectionHeader id="develop" title="저장소에서 개발할 때">
      <div className="site-stack">
        <ol className="site-list site-list-ordered">
          {text.devSteps.map((step, i) => <li key={i}><Rich text={step} base="packages/mcp/" /></li>)}
        </ol>
        <CodeBlock label="json · MCP 클라이언트 서버 설정" code={docs.mcpReadme.devConfig} />
        <p><Rich text={text.cwd[0]!} base="packages/mcp/" /></p>
        <Sources items={[{ file: MCP_README }]} />
      </div>
    </SectionHeader>
    <SectionHeader id="instructions" title="AI가 받는 안내" description="연결하면 서버가 initialize 응답의 instructions 로 처음 주는 글 — 빌드 때 서버에서 받았다">
      <div className="site-stack-sm">
        <blockquote className="site-quote">{mcp.instructions}</blockquote>
        <DescriptionList columns={2} items={[
          { label: '서버', value: <code className="site-code">{mcp.name} {mcp.version}</code> },
          { label: '프로토콜', value: <code className="site-code">{mcp.protocolVersion}</code> },
        ]} />
      </div>
    </SectionHeader>
    <SectionHeader id="tools" title="도구" count={mcp.tools.length} description="tools/list 응답 — 모두 읽기 전용이다">
      <div className="site-card-grid">{mcp.tools.map((tool) => <ToolCard key={tool.name} tool={tool} />)}</div>
    </SectionHeader>
    <SectionHeader id="resources" title="리소스" count={mcp.resources.length} description="resources/list 응답">
      <div className="site-card-grid">{mcp.resources.map((resource) => <ResourceCard key={resource.uri} resource={resource} />)}</div>
    </SectionHeader>
    <SectionHeader id="examples" title="질문 → 추천 예시"
      description="which_component 정답 세트(docs/qa/fixtures/which-component-golden.json)의 실제 요청 문장을 빌드 때 서버에 보낸 응답이다. 최종 선택은 호출한 AI가 한다.">
      <div className="site-page">
        {mcp.examples.map((example, i) => <SectionHeader key={example.query} id={`example-${i + 1}`} as="h3" title={example.query}
          description={<span>정답 세트의 정답: {example.expected
            ? example.expected.map((name, j) => <span key={name}>{j > 0 && ' · '}<ComponentName name={name} /></span>)
            : '아직 맞는 부품 없음'}</span>}>
          <div className="site-stack">
            <CodeBlock label="tools/call 인자" code={JSON.stringify(example.call, null, 2)} />
            <Candidates candidates={example.candidates} />
          </div>
        </SectionHeader>)}
      </div>
    </SectionHeader>
  </DocLayout>;
}
