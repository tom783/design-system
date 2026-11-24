/// <reference types="vite/client" />

/** vite.config.ts 의 siteMeta() 가 이 커밋의 파일에서 만든다. */
declare module 'virtual:site-meta' {
  const meta: {
    /** packages/ui/package.json — 세 패키지 lockstep */
    version: string;
    /** CHANGELOG.md 에서 날짜가 붙은 첫 판(npm 게시판). 없으면 null */
    published: { version: string; date: string } | null;
    /** packages/ui/package.json repository.url 에서 */
    repository: string | null;
    /** 띄운(빌드한) 시점의 작업 폴더 */
    sha: string | null;
    dirty: boolean;
    /** DESIGN.md 번호 붙은 제목: '11.8' → '여러 단계 폼 — Steps (R43)' */
    designSections: Record<string, string>;
  };
  export default meta;
}
