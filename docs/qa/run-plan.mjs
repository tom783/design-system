// run-all 의 실행 계획 — 하네스 목록, 인자 해석.
//
// 부작용이 없는 함수만 둔다(서버·브라우저·파일 쓰기 없음). run-all.mjs 는 import 하는 순간
// 서버를 띄우므로 단위 테스트(run-plan.test.mjs)는 이 파일만 부른다.
//
//   --only a,b       하네스 파일 이름(.mjs 있어도 없어도)으로 일부만. 모르는 이름이면 실패
//   --timings <json> 실행한 하네스마다 초·결과를 남긴다
//   --build          스토리북을 다시 빌드한다

// 순서가 곧 실행 순서다(--only 도 이 순서로 돈다). 새 하네스는 여기에 넣는다.
export const HARNESSES = [
  ['steps-render-verify.mjs', '단계 표시·완료 이동·요약·폼 포커스'],
  ['pack-verify.mjs', 'tarball 배포 리허설'],
  ['render-verify.mjs', '기본 컴포넌트·테이블'],
  ['charts-render-verify.mjs', '차트 로딩·오류'],
  ['segmented-control-render-verify.mjs', '세그먼트·키보드·좁은 폭·대비'],
  ['stat-tile-render-verify.mjs', 'KPI 값·증감·접근성·좁은 폭'],
  ['dogfood3-render-verify.mjs', '필터 선택·기간 입력·중립 계열'],
  ['loading-render-verify.mjs', '스켈레톤·진행률'],
  ['state-render-verify.mjs', '상태·아바타·썸네일'],
  ['guide-render-verify.mjs', 'Tooltip·Hint·Tour'],
  ['form-render-verify.mjs', '폼·한글 IME'],
  ['date-time-render-verify.mjs', '날짜+시각·직접 입력·분 칸·키보드'],
  ['file-upload-render-verify.mjs', '파일 선택·검증·진행·미리보기·수명'],
  ['combobox-render-verify.mjs', '검색 선택·한글 IME'],
  ['multi-select-render-verify.mjs', '다중 선택·태그·키보드·IME'],
  ['collapse-render-verify.mjs', '접고 펴기·글 넘침·내용 변화'],
  ['media-viewer-render-verify.mjs', '미디어 팝업·플로팅·화면 속 화면'],
  ['carousel-render-verify.mjs', '캐러셀·네이티브 스냅·자동 넘김 정지'],
  ['pagination-render-verify.mjs', '페이지 이동·크기·포커스·표 조립'],
  ['sheet-render-verify.mjs', '옆 패널·닫기 보호·서랍'],
  ['app-shell-render-verify.mjs', '앱 셸·사이드 메뉴·페이지 머리'],
  ['input-consistency-render-verify.mjs', '검색 아이콘·카드·선택 트리거·공개 유틸리티'],
  ['input-render-verify.mjs', '입력 타입·Textarea·Radio·Switch'],
  ['peek-render-verify.mjs', 'Peek·다녀온 행'],
  ['mcp-client-verify.mjs', 'MCP 서버'],
  ['list-screen-render-verify.mjs', '목록 필터·행 액션·알림'],
  ['layer-detail-render-verify.mjs', '레이어 디테일·O1–O6 라이트·다크'],
  ['design-detail-render-verify.mjs', '디자인 디테일·D1–D6'],
  ['detail-render-verify.mjs', '상세 탭·경로·편집·삭제 확인'],
  ['create-render-verify.mjs', '등록·Enter 계약·목록 왕복'],
  ['docs-render-verify.mjs', '사용 문서·매니페스트 일치'],
];

export const harnessName = (file) => file.replace(/\.mjs$/, '');

export class UsageError extends Error {}

export const USAGE = `사용법: node docs/qa/run-all.mjs [--build] [--only a,b] [--timings <out.json>]
  --only a,b        이 하네스만 (파일 이름, .mjs 생략 가능)
  --timings <파일>   하네스마다 소요 시간(초)·결과를 JSON 으로 남긴다
  --build           스토리북을 다시 빌드한다`;

const VALUE_FLAGS = new Set(['--only', '--timings']);

/**
 * argv(process.argv.slice(2)) 를 해석한다. 틀리면 UsageError 를 던진다.
 * 오타를 무시하면 의도와 다른 범위가 조용히 돈다. 모르는 인자도 실패시킨다.
 */
export function parseArgs(argv, names = HARNESSES.map(([f]) => harnessName(f))) {
  const opts = { build: false, only: null, timings: null };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue; // pnpm qa -- --only x 처럼 넘어오는 구분자
    if (arg === '--build') { opts.build = true; continue; }
    const eq = arg.indexOf('=');
    const flag = eq > 0 ? arg.slice(0, eq) : arg;
    if (!VALUE_FLAGS.has(flag)) throw new UsageError(`모르는 인자: ${arg}`);
    if (seen.has(flag)) throw new UsageError(`${flag} 를 두 번 줬습니다.`);
    seen.add(flag);
    let value;
    if (eq > 0) value = arg.slice(eq + 1);
    else {
      value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`${flag} 에 값이 없습니다.`);
      i++;
    }
    if (flag === '--only') opts.only = parseOnly(value, names);
    else {
      if (!value) throw new UsageError('--timings 에 파일 경로가 없습니다.');
      opts.timings = value;
    }
  }
  return opts;
}

function parseOnly(value, names) {
  const known = new Set(names);
  const picked = [];
  for (const raw of value.split(',')) {
    const name = harnessName(raw.trim());
    if (!name) throw new UsageError(`--only 에 빈 이름이 있습니다: "${value}"`);
    if (!known.has(name)) {
      throw new UsageError(`--only: 모르는 하네스 "${raw.trim()}"\n  알려진 이름: ${names.join(', ')}`);
    }
    if (!picked.includes(name)) picked.push(name);
  }
  return picked;
}

/**
 * 인자에 따라 돌릴 하네스를 고른다.
 * 반환: { harnesses: [[file, label]...] }
 */
export function selectHarnesses(opts, { harnesses = HARNESSES } = {}) {
  if (opts.only) {
    const want = new Set(opts.only);
    return { harnesses: harnesses.filter(([f]) => want.has(harnessName(f))) };
  }
  return { harnesses };
}
