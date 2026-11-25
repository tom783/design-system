/// <reference types="vite/client" />

/** vite.config.ts 의 siteMeta() 가 이 커밋의 파일에서 만든다. */
declare module 'virtual:site-meta' {
  const meta: {
    /** packages/ui/package.json — 세 패키지 lockstep */
    version: string;
    /**
     * CHANGELOG.md 에서 날짜가 붙은 첫 판(npm 게시판). 없으면 null.
     * components: 그 판 태그(v{version})의 매니페스트 이름 — 태그를 못 읽으면 null(확인 불가)
     */
    published: { version: string; date: string; components: string[] | null } | null;
    /** packages/ui/package.json repository.url 에서 */
    repository: string | null;
    /** 띄운(빌드한) 시점의 작업 폴더 */
    sha: string | null;
    dirty: boolean;
    /** DESIGN.md 번호 붙은 제목: '11.8' → '여러 단계 폼 — Steps (R43)' */
    designSections: Record<string, string>;
    /** 같은 절의 GitHub 앵커: '2.3' → '23-브랜드-레드와-에러-레드--이-시스템의-최대-난점' */
    designAnchors: Record<string, string>;
  };
  export default meta;
}

/** vite-plugins/site-docs.ts 가 README·packages/mcp 와 실제 MCP 서버 응답에서 만든다. */
declare module 'virtual:site-docs' {
  interface DocHeading { text: string; slug: string }
  export interface McpToolParam {
    name: string;
    required: boolean;
    type: string;
    enum: string[] | null;
    range: [number, number] | null;
  }
  export interface McpTool { name: string; title: string; description: string; params: McpToolParam[] }
  export interface McpResource { uri: string; name: string; title: string; description: string; mimeType: string }
  export interface McpCandidate { name: string; score: number; reasons: string[] }
  export interface McpExample {
    query: string;
    lang: string;
    /** which_component 정답 세트의 정답(허용 정답 여럿이면 배열). 맞는 부품이 아직 없으면 null */
    expected: string[] | null;
    call: { name: string; arguments: { description: string; limit: number } };
    candidates: McpCandidate[];
  }
  const docs: {
    /** text: 제목·첫 글자로 찾은 README 단락(목록이면 항목들) — vite-plugins/site-docs.ts README_TEXT */
    readme: {
      headings: DocHeading[];
      text: Record<'intro' | 'peer' | 'entryCss' | 'font' | 'standalone' | 'appWide' | 'utilities' | 'tailwindIntro' | 'tailwindEntry' | 'mcpCli', string[]>;
      install: string;
      /** peer 단락의 설치 명령(인라인 코드) — React·React DOM 까지 함께 설치 */
      peerInstall: string;
      entry: string;
      tailwind: string;
      mcp: string;
    };
    mcpReadme: {
      headings: DocHeading[];
      text: Record<'intro' | 'connect' | 'npx' | 'devSteps' | 'cwd', string[]>;
      connect: string;
      devConfig: string;
    };
    requirements: { react: string | null; reactDom: string | null; node: string | null };
    mcp: {
      name: string;
      version: string;
      protocolVersion: string;
      /** initialize 응답의 instructions — 연결한 AI 가 처음 받는 안내 */
      instructions: string;
      tools: McpTool[];
      resources: McpResource[];
      examples: McpExample[];
    };
  };
  export default docs;
}

/**
 * vite-plugins/screens.ts 가 조립 화면 스토리(screens-*.stories.tsx)와 그 도우미 파일(같은 폴더 · docs/examples)이 패키지 진입점
 * (`'../index'` · `'../../src'`)에서 가져오는 이름으로 만든다.
 * 파일 이름 → 가져다 쓰는 디자인 시스템 이름(부품·부분·함수 섞임 — 부품만 고르는 것은 사이트가 매니페스트로 한다).
 */
declare module 'virtual:site-screens' {
  const screens: Record<string, string[]>;
  export default screens;
}
