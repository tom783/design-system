# 앱 번들 크기 (목표 57)

앱이 `@s2life/ui` 에서 부품 몇 개를 가져올 때 실제로 받는 JS 크기와, 그것을 지키는 검사.

```bash
pnpm size                                   # = node scripts/bundle-size-check.mjs (pnpm verify 마지막 단계)
node scripts/bundle-size-check.mjs --keep   # 묶은 번들을 남겨 무엇이 늘었는지 본다
node docs/qa/measure/next-consumer.mjs [--webpack] [--optimize]   # Next App Router 빈 앱(일회성 계측)
```

## 재는 방법

게시 경로 그대로 잰다. 저장소 dist·소스를 직접 묶으면 `exports`·`sideEffects`·`"use client"` 를 거친 크기를 못 본다.

1. `npm pack` (tokens·ui). prepack 이 빌드한다.
2. 빈 소비 앱에 tarball 만 pnpm 격리 설치(`node-linker=isolated`, 끌어올리기 없음).
3. 묶음 세 개를 Vite 라이브러리 빌드로 묶는다 — `react`·`react-dom` 외부, 축소는 앱 빌드와 같게(공백까지).
   Vite 라이브러리 es 포맷은 PURE 주석을 지키려고 공백·주석을 남기므로(같은 입력이 약 1.5배) `output.minify: true` 로 켠다.
4. 단위 kB = 1000바이트(Vite 출력과 같다). gzip 은 level 9.
5. lucide 아이콘은 번들에 남는 아이콘 데이터 모양(`{name:"chevron-down",size:24,node:[…]}`)으로 센다.
   tokens.json 원본은 원본에만 있는 키(`dangerSeparation`·`contrastFloor`·`chromaCurve`·`lineHeightPct`)로 찾는다.

| 묶음 | 내용 |
|---|---|
| Button 하나 | `export { Button } from '@s2life/ui'` |
| 목록 화면 10개 | AppShell · SideNav · PageHeader · FilterBar · BulkActionBar · DataTable · Pagination · Button · StatusChip · DatePicker (Screens/OrderList 한 장) |
| 전체 | `export * from '@s2life/ui'` |

## 전후 (2026-11-24, @s2life/ui 0.4.0 tarball, 같은 방법)

| 묶음 | 0.4.0 (6052d8e) | A 아이콘 | A+B 모듈별 | **A+B+C 지금** | 상한(min) |
|---|---|---|---|---|---|
| Button 하나 | 1,097.1kB · gz 280.4kB | 232.4 · 66.4 | 34.5 · 11.3 | **34.5kB · gz 11.3kB** | 60kB (합격 기준) |
| 목록 화면 10개 | 1,343.4kB · gz 349.6kB | 484.5 · 138.4 | 425.4 · 126.6 | **385.9kB · gz 117.1kB** | 500kB |
| 전체 export * | 1,533.7kB · gz 408.7kB | 675.5 · 197.9 | 675.5 · 201.5 | **636.0kB · gz 192.0kB** | 820kB |
| lucide 아이콘 | 2,102개(전부) | 0 · 23 · 33 | 0 · 23 · 33 | **0 · 23 · 33개** | 80개 |
| tokens.json 원본 | 들어 있음 | 들어 있음 | 들어 있음 | **없음** | 없어야 함 |

- **A** — carousel 이 공개 `icons` 진입점(`export * from 'lucide-react'`)을 가져와 단일 번들 안에 lucide 전체가 이름공간 객체로
  복사됐다. 부품은 `lucide-react` 를 직접 가져온다. `scripts/check-boundaries.mjs` 가 부품·lib 의 `icons`·`index` 진입점 import 를 막는다(스토리는 예외).
- **B** — `preserveModules`: 소스 파일마다 dist 파일 하나(JS 105개). 단일 `index.js` 는 앱 번들러가 쓰지 않는 부품을 덜어내지 못했다.
  `package.json` 의 `sideEffects: ["*.css"]` 가 그대로라 JS 모듈은 부수효과 없음으로 취급된다(부품 JS 는 CSS 를 import 하지 않는다 — §15.5).
  전체 묶음 gzip 은 3.6kB 늘었다(원인은 따로 확인하지 않았다). 전체를 가져오는 앱은 드물다.
- **C** — `lib/layer.ts`·`lib/use-delayed-loading.ts` 가 `docs/research/tokens.json` 전체를 import 해 생성 JSON(대비 검증 결과까지)이
  번들에 들어갔다(축소 후 약 40kB). 필요한 값 3개만 담은 생성 상수 `lib/runtime-tokens.ts` 를 쓴다
  (목록 `docs/research/ui-runtime-tokens.mjs`, 생성 `pnpm tokens`, 일치 검사 pre-commit + `runtime-tokens.test.mjs`).
- Button 34.5kB 중 28.4kB 는 Button 이 쓰는 `tailwind-merge` 다(cva+clsx 1.0kB, Radix Slot 3.2kB).

감독 세션의 사전 측정(1,356kB 등)은 Vite 라이브러리 es 포맷의 공백 남김이 들어간 값이라 이 표와 다르다. 같은 방법의 공백 남김 값은
0.4.0 Button 1,423kB → 지금 48.6kB 였다.

## Next.js App Router (서버 컴포넌트 페이지)

`docs/qa/measure/next-consumer.mjs` — Next 16.4.6 빈 앱. 서버 컴포넌트 페이지가 `Button·StatusChip·Card` 와
`@s2life/ui/icons` 의 `Check` 를 import 하고, `"use client"` 섬이 `Select`·`useState` 를 쓴다. SSR HTML·하이드레이션 뒤 클릭·
Select 열림·서버 버튼 38px·콘솔 오류 0 을 확인하고, 페이지가 받은 클라이언트 JS 를 잰다(Next 런타임만 약 570kB).

| 빌드 | 0.4.0 | B (배너를 모든 파일에) | **지금** |
|---|---|---|---|
| Turbopack (Next 16 기본) | 1,694kB · 전송 466kB · 아이콘 2,102 | 1,509kB · 424kB · 2,102 | **590kB · 전송 179kB · 아이콘 8** |
| webpack (`next build --webpack`) | **빌드 실패** — `"export *" in a client boundary` | — | 1,103kB · 334kB · 33 |
| webpack + `optimizePackageImports: ['@s2life/ui']` | — | — | **583kB · 178kB · 8** |

### `"use client"` 판단

**부품·lib 모듈마다 붙이고, 공개 진입점 두 개(`index.js`·`icons.js`)에는 붙이지 않는다.** `scripts/build-ui.mjs` 의 banner.

- 진입점에 붙이면 진입점 전체가 클라이언트 참조 하나가 된다. 서버 페이지가 Button 하나를 써도 부품 전부가, `icons` 는
  `export * from 'lucide-react'` 라 lucide 2,102개가 클라이언트 번들에 실렸다(위 표 B 열). webpack 은 아예 빌드를 거부했다 —
  0.4.0 의 `icons` 진입점은 webpack Next 앱의 서버 컴포넌트에서 쓸 수 없었다.
- lucide 는 `Icon`·context 모듈에만 `"use client"` 를 두어 아이콘을 서버에서 그리게 설계돼 있다. 진입점이 그 설계를 덮지 않게 한다.
- 진입점은 재export 뿐이라 서버에서 평가돼도 부품 코드가 돌지 않는다. `build-ui.mjs` 가 진입점에 재export 아닌 문장이 끼거나
  배너가 붙으면, 다른 모듈에 배너가 빠지면, src 밖 모듈이 dist 에 생기면(C 의 tokens.json 이 `dist/docs/research/tokens.js` 로 나왔다) 빌드를 멈춘다.
  `pack-verify` 도 설치된 tarball 에서 같은 규칙을 본다.
- 순수 모듈(`cn`·`toCsv`·`buttonVariants`·`initials` 등)에도 붙는다. 0.4.0(단일 파일 전체가 `"use client"`)과 같은 계약이다:
  서버 컴포넌트는 부품을 렌더만 하고 함수 호출은 클라이언트 컴포넌트에서 한다. 서버에서 부를 수 있는 순수 함수 진입점은 공개 API
  추가라 이번 범위 밖이다(제안).
- 모듈마다 붙이는 이유: 진입점에만 붙이면 barrel 최적화(`optimizePackageImports`)처럼 진입점을 건너뛰고 부품 파일을 직접 가져오는
  번들러에서 훅 부품이 서버에서 평가된다. 실측: webpack + optimizePackageImports 가 위처럼 통과한다.
- webpack 은 서버 그래프에서 닿는 `"use client"` 모듈을 모두 클라이언트 엔트리로 만들어(진입점이 부품 전부를 재export) 부품 전부를 싣는다.
  README·시작하기 문서에 `optimizePackageImports` 를 안내했다. Turbopack 기본 빌드는 설정이 필요 없다.

### exports · d.ts

`package.json` 은 바꾸지 않았다. `exports` 는 `.`·`./icons`·CSS·tokens 그대로라 `components/*.js` 같은 깊은 경로는 열리지 않는다
(`./internal` 경계 유지). d.ts 는 원래 tsc 가 파일마다 냈고(rootDir `src`), JS 가 같은 경로에 나란히 생겼다.
Vite 소비 앱(`pnpm qa:pack`)·Next(Turbopack·webpack)·Node ESM 직접 import 가 모두 해석된다.

## 상한을 넘으면

`node scripts/bundle-size-check.mjs --keep` 으로 남긴 `dist/<묶음>/bundle.js` 를 본다. Button 60kB 와 아이콘·tokens.json 검사는
합격 기준이라 올리지 않는다 — 무언가 통째로 따라온 것이다. 목록·전체 상한은 실측의 약 130% 다. 부품이 늘어 정당하게 넘으면
`scripts/bundle-size-check.mjs` 의 `BUDGET` 과 이 표를 함께 고친다.

## CI

`pnpm size` 는 `pnpm verify`(pre-push) 마지막에 돈다. GitHub Actions 에는 아직 없다(DevOps 소유). 걸 때는 `checks` job 의
`pnpm test` 다음에 `pnpm size` 한 단계 — 로컬 macOS 실측 5~6초(pack 2회·격리 설치·Vite 3회), 빈 러너는 pnpm 저장소 캐시가 있으면
약 15~30초로 본다. Next 계측(`docs/qa/measure/next-consumer.mjs`)은 next 설치가 필요해 게이트에 넣지 않았다(로컬 1회 17초, pnpm 저장소 캐시 있음).

## 남은 것 (제안)

- `internal/*.ts` 의 `export * from '@radix-ui/…'` 를 부품이 `import * as` 로 받아 rolldown 이 이름공간 객체(`__reExport`)를 만든다.
  해당 Radix 패키지의 쓰지 않는 export 가 덜려 나가지 않는다. 패키지 하나가 부품 하나라 손실은 작다 — 이름 있는 재export 로 바꾸면 덜어진다.
- ui dist 의 `tokens.json`·`tokens.css`·`theme.css`(약 107kB)는 `@s2life/tokens` 와 바이트가 같다(pack-verify 가 보장). 공개 exports
  (`@s2life/ui/tokens.css` 등)라 지우면 공개 API 변경이다. 앱 JS 번들에는 들어가지 않는다 — tarball 크기만의 문제.
- MCP `manifest.json`(253kB) 압축은 저장 형태를 바꾸면 HEAD 서버와 새 서버의 MCP 응답 바이트 대조가 필요하다. 이번에는 하지 않았다.
