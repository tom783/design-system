// which_component 의 단순 키워드 점수. 외부 모델이나 상태를 쓰지 않는다 — 같은 입력이면 같은 순위다.
// 점수 규칙과 그 근거는 docs/qa/r38-match-ranking.md 의 "지금 순위 규칙" 절에 있다.

// 공백 없는 한국어 조사 결합과 영문 대소문자를 함께 흡수한다.
const normalize = (text) => text.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, '');
// 한글 덩어리와 라틴·숫자 덩어리를 따로 자른다. "KPI를" 은 kpi · 를 이다.
const TOKEN = /\p{Script=Hangul}+|[a-z0-9]+|[\p{L}\p{N}]+/gu;
const tokenize = (text) => text.normalize('NFKC').toLowerCase().match(TOKEN) ?? [];
// 낱말과 그 앞이 구두점으로 끊겼는지를 함께 돌려준다. "선택·해제" 의 '·' 는 공백과 달리 구절을 끊는다 —
// 원문 비교(normalize)는 구두점을 남기므로 번역 쪽도 같은 자리를 끊어야 한다.
const segment = (text) => {
  const source = text.normalize('NFKC').toLowerCase();
  let last = 0;
  return [...source.matchAll(TOKEN)].map(match => {
    const broken = /\S/u.test(source.slice(last, match.index));
    last = match.index + match[0].length;
    return { word: match[0], broken };
  });
};
const isLatin = (word) => /^[a-z0-9]+$/u.test(word);

// 어느 컴포넌트도 가려내지 못하는 일반어. 목적·쓰임새 문장에 흔히 들어가 우연히 겹친다.
// R28 실측: "zzzz 아무 관련 없는 말" 이 Card 의 "관련 정보를 카드로 묶을 때" 와 '관련' 하나로 7점을 받았다.
// 키워드·이름 일치에는 쓰지 않는다 — 문장 토큰 비교에서만 뺀다.
const GENERIC_WORDS = new Set(['관련', '아무', '없는', '있는', '위한', '대한', '통해', '경우', '모든', '어떤']);

// 영어 낱말의 복수형·진행형·과거형을 한 줄기로 모은다(목표 64). 사전과 질의에 같은 함수를 써서 일관되기만 하면 된다 —
// save·saves·saving·saved → sav, row·rows → row, shipping → ship, categories → category.
export function stemEnglish(word) {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.length > 4 && /(s|x|z|ch|sh)es$/u.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/u.test(w)) w = w.slice(0, -1);
  const undouble = (s) => (/([b-df-hj-np-tv-z])\1$/u.test(s) && !/(ll|ss|zz)$/u.test(s) ? s.slice(0, -1) : s);
  if (w.length > 5 && w.endsWith('ing')) w = undouble(w.slice(0, -3));
  else if (w.length > 4 && w.endsWith('ed')) w = undouble(w.slice(0, -2));
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

// 한국어 낱말 끝의 조사·어미를 떼어 목적·쓰임새 문장과 비교한다(목표 64). "목록을"·"페이지로"·"필터링"이
// 문장의 '목록'·'페이지'·'필터' 와 만나지 못했다. 줄기가 두 글자 미만이면 쓰지 않는다 — 우연한 겹침이 늘어난다.
const KOREAN_ENDINGS = ['에서는', '에서도', '으로는', '으로도', '에서', '으로', '에게', '한테', '까지', '부터', '처럼', '보다',
  '하기', '하게', '하는', '하고', '해서', '하면', '해줘', '되는', '되게', '되면', '링', '을', '를', '이', '가', '은', '는', '의',
  '에', '로', '와', '과', '도', '만', '랑', '할', '한', '된', '게', '고', '기'];
const koreanStems = (word) => {
  if (isLatin(word)) return [];
  const stems = [];
  for (const ending of KOREAN_ENDINGS) if (word.endsWith(ending) && word.length - ending.length >= 2) stems.push(word.slice(0, -ending.length));
  return stems;
};

// 영어 질의를 메타데이터의 한국어 어휘로 옮기는 대응표(목표 64). 메타데이터는 한국어로만 쓰여 있어 정답 세트의
// 영어 질의 50개 중 27개가 후보 0개였다. 부품 하나를 맞추는 질의가 아니라 낱말 단위다 — 각 한국어 어휘는
// component-intent.mjs 의 keywords·purpose·useWhen 에 실제로 있는 말이다. 여러 낱말 구절은 줄기 순서대로 맞춘다.
const ENGLISH_TERMS = {
  // 목록·표
  list: '목록', table: '표 테이블', grid: '표', row: '행', column: '열', record: '레코드', sort: '정렬', sortable: '정렬',
  total: '합계', sum: '합계', subtotal: '합계', footer: '하단', 'line item': '품목', item: '항목', entry: '항목',
  page: '페이지', paginate: '페이지 이동', pagination: '페이지 이동', 'per page': '몇 개씩', 'page size': '페이지 크기',
  filter: '필터', 'narrow down': '필터', chip: '칩', toolbar: '툴바', 'saved view': '저장된 보기', applied: '적용된',
  bulk: '일괄', batch: '일괄', mass: '대량', select: '선택', tick: '체크', check: '체크', checkbox: '체크',
  deselect: '선택 해제', several: '여러', multiple: '여러', many: '많은', hundreds: '많은 옵션', thousands: '많은 옵션',
  // 화면 틀·이동
  layout: '레이아웃', shell: '화면 틀', sidebar: '사이드바', 'side nav': '사이드 메뉴', navigation: '내비게이션', nav: '내비게이션',
  navigate: '이동', menu: '메뉴', left: '왼쪽', header: '머리', title: '제목', heading: '제목', breadcrumb: '경로', trail: '경로',
  path: '경로', back: '뒤로', tab: '탭', panel: '패널', drawer: '서랍', 'side panel': '옆 패널', 'slide over': '옆 패널',
  modal: '모달', popup: '팝업', dialog: '다이얼로그', confirm: '확인', confirmation: '확인창', permanent: '되돌릴 수 없', permanently: '되돌릴 수 없',
  irreversible: '되돌릴 수 없', undo: '되돌릴', kebab: '점 세 개', 'three dot': '점 세 개', overflow: '더보기 메뉴',
  dropdown: '드롭다운', 'drop down': '드롭다운',
  // 입력
  input: '입력', field: '입력칸', textbox: '입력칸', 'text box': '입력칸', 'text field': '입력칸', text: '텍스트', box: '칸', number: '숫자',
  numeric: '숫자', amount: '금액', price: '가격', currency: '통화', password: '비밀번호', search: '검색', searchable: '검색',
  phone: '전화번호', quantity: '수량', qty: '수량', unit: '단위', suffix: '접미사', percent: '퍼센트', percentage: '퍼센트',
  multiline: '여러 줄', 'multi line': '여러 줄', memo: '메모', note: '메모', comment: '비고', remark: '비고', textarea: '여러 줄',
  radio: '라디오', 'only one': '하나만 선택', toggle: '토글', switch: '스위치', enable: '켜기', disable: '끄기', 'turn on': '켜기',
  instantly: '즉시 적용', immediately: '즉시 적용', label: '라벨', 'form field': '필드', form: '폼', validation: '유효성 검사',
  validate: '유효성 검사', error: '오류', invalid: '오류', wrong: '틀렸을 때', message: '문구', autocomplete: '자동완성',
  combobox: '콤보박스', 'type ahead': '타이핑으로 찾기', typeahead: '타이핑으로 찾기', tag: '태그', option: '옵션',
  date: '날짜', 'date range': '기간', range: '기간', period: '기간', calendar: '달력', time: '시각', datetime: '날짜 시간',
  schedule: '예약', day: '일', week: '주', month: '월', daily: '일', weekly: '주', monthly: '월', today: '오늘',
  upload: '업로드', attach: '첨부', attachment: '첨부', file: '파일', 'drag and drop': '드래그 앤 드롭', excel: '엑셀', spreadsheet: '엑셀',
  csv: '엑셀', import: '일괄 등록', 'next field': '다음 입력칸', keyboard: '키보드', 'multi step': '여러 단계',
  step: '단계', wizard: '단계', stepper: '단계', progress: '진행', indicator: '표시',
  // 동작·버튼
  button: '버튼', action: '액션', save: '저장', cancel: '취소', delete: '삭제', remove: '삭제', edit: '편집', rename: '편집',
  sticky: '하단 고정', stuck: '고정', fixed: '고정', bottom: '하단', 'bottom bar': '하단 고정', create: '등록', primary: '주요',
  // 상태·피드백
  status: '상태', state: '상태', badge: '칩', complete: '완료', done: '완료', warning: '경고', delay: '지연',
  toast: '토스트', notification: '알림', notify: '알림', snackbar: '토스트', success: '완료', empty: '빈 상태',
  'no result': '데이터 없음', 'no data': '데이터 없음', reset: '초기화', retry: '재시도', 'try again': '재시도', fail: '실패',
  load: '불러오기', fetch: '불러오는', skeleton: '스켈레톤', placeholder: '자리 표시',
  'long running': '오래 걸리는', export: '내보내기', background: '백그라운드 작업', remaining: '남은 시간', eta: '예상 시간',
  tooltip: '툴팁', hover: '호버', 'mouse over': '호버', hint: '힌트', 'new feature': '새 기능', tour: '투어', onboarding: '온보딩',
  walkthrough: '단계별 안내', tutorial: '사용법', guide: '안내', preview: '미리보기', 'quick view': '미리보기', popover: '팝오버',
  // 상세·데이터 표시
  'key value': '키 값', value: '값', pair: '키 값', detail: '상세', info: '정보', information: '정보', breakdown: '금액 내역',
  fee: '금액', discount: '할인', payment: '결제', summary: '요약', card: '카드', group: '묶음', collapse: '접기', expand: '펼치기',
  advanced: '고급 설정', 'read more': '더보기', 'show more': '더보기', truncate: '말줄임', ellipsis: '말줄임', clamp: '말줄임',
  image: '이미지', photo: '사진', picture: '사진', thumbnail: '썸네일', avatar: '아바타', initial: '이니셜', profile: '사용자 사진',
  zoom: '이미지 확대', enlarge: '이미지 확대', lightbox: '라이트박스', video: '동영상', banner: '배너', slide: '슬라이드',
  slider: '슬라이더', carousel: '캐러셀', 'picture in picture': '화면 속 화면', area: '영역',
  // 차트·지표
  chart: '차트', graph: '그래프', legend: '범례', metric: '지표', dashboard: '대시보드', trend: '추이', 'line chart': '선 그래프',
  'time series': '시계열', band: '밴드', target: '목표', goal: '목표', actual: '실적', achievement: '달성률', share: '비중',
  composition: '구성비', stacked: '누적', change: '증감', 'compared to': '대비', 'vs yesterday': '전일 대비',
  completion: '완료', rate: '률', segment: '세그먼트', view: '보기', 'switch view': '보기 전환',
  'kpi card': 'KPI 지표', 'metric card': '지표', 'area chart': '면적 차트',
  // 업무 낱말 — 메타데이터의 '주문 목록'·'배송 상태'·'상품 사진'·'선택한 주문' 같은 구절과 만난다
  order: '주문', shipment: '출고', ship: '배송', delivery: '배송', warehouse: '창고', product: '상품', customer: '고객',
  supplier: '거래처', vendor: '거래처', 'shipping fee': '배송비', weight: '중량', email: '이메일', icon: '아이콘', refresh: '새로고침',
  // 위치·방향
  right: '오른쪽', 'right side': '오른쪽', top: '위', above: '위', under: '아래', below: '아래', content: '본문', 'content area': '본문',
  // 자주 쓰는 동사·형용사
  pick: '선택', choose: '선택', selector: '선택', plan: '예정', due: '예정일', 'due date': '예정일', hide: '숨김', basic: '기본',
  single: '단일', format: '형식', fallback: '대체', broken: '실패', bar: '바', 'row action': '행 액션',
  'stick bottom': '하단 고정', 'stuck bottom': '하단 고정', 'fix bottom': '하단 고정', 'sticky bottom': '하단 고정', 'pin bottom': '하단 고정',
  'save cancel': '취소 저장', 'cancel save': '취소 저장', 'label value': '라벨 값',
};
const englishTerms = new Map();
for (const [en, ko] of Object.entries(ENGLISH_TERMS)) {
  const key = en.split(/\s+/u).map(stemEnglish).join(' ');
  // 줄기가 같은 두 낱말(state·stat)이 다른 말로 가면 하나가 조용히 덮인다 — 모듈을 읽을 때 막는다.
  if (englishTerms.has(key)) throw new Error(`영어 대응표 줄기 충돌: ${en} → ${key}`);
  englishTerms.set(key, ko);
}
const longestPhrase = Math.max(...[...englishTerms.keys()].map(key => key.split(' ').length));
// 영어로 묻는 말에 흔히 섞이는 기능어. 대응표에 없는 낱말은 어차피 버려지지만, 구절 맞춤에서 건너뛰지 않게 둔다.
const ENGLISH_STOPWORDS = new Set(['a', 'an', 'the', 'to', 'of', 'for', 'with', 'in', 'on', 'at', 'by', 'and', 'or', 'from', 'as', 'it', 'is']);

// 한국어 활용형·동의어를 메타데이터 어휘로 모은다(목표 64). 낱말 앞부분이 같으면 바꾼다 — "걸러"·"거르는" 은 필터,
// "한꺼번에" 는 일괄, "골라" 는 선택이다. 메타데이터에 같은 뜻이 이미 있는 말만 둔다.
const KOREAN_SYNONYMS = [
  [['필터링', '걸러', '거르'], '필터'], [['한꺼번에', '한번에'], '일괄'], [['골라', '고르'], '선택'], [['바로'], '즉시'],
  [['접어'], '접기'], [['펼쳐'], '펼치기'], [['알리', '알려'], '알림'], [['배지', '뱃지'], '칩'], [['드롭다운'], '셀렉트'],
  [['수천', '수백', '수만'], '많은 옵션'],
].flatMap(([variants, canonical]) => variants.map(variant => [variant, canonical]));

// 질의를 메타데이터 어휘로 제자리 번역한다. 영어 낱말·구절은 한국어로, 한국어 활용형은 대표 어휘로 바꾸고 순서는 지킨다 —
// 떨어진 키워드 낱말의 순서 판정이 원문과 같게 된다. 대응표에 없는 영어 낱말과 숫자는 버린다(원문 쪽에서 따로 맞춘다).
// 결과는 [{ word, broken }] 이다. broken 은 앞이 구두점으로 끊겼다는 뜻이다.
function translate(segments) {
  const out = [];
  for (let index = 0; index < segments.length;) {
    const { word, broken } = segments[index];
    if (!isLatin(word)) {
      const synonym = KOREAN_SYNONYMS.find(([variant]) => word.startsWith(variant));
      out.push({ word: synonym ? synonym[1] + word.slice(synonym[0].length) : word, broken });
      index += 1;
      continue;
    }
    // 구두점 없이 이어진 라틴 덩어리를 기능어를 뺀 줄기로 바꾸고, 가장 긴 구절부터 대응표에서 찾는다.
    let end = index + 1;
    while (end < segments.length && isLatin(segments[end].word) && !segments[end].broken) end += 1;
    const stems = segments.slice(index, end).map(item => item.word).filter(item => !ENGLISH_STOPWORDS.has(item)).map(stemEnglish);
    let first = true;
    for (let at = 0; at < stems.length;) {
      let size = Math.min(longestPhrase, stems.length - at);
      for (; size > 0; size -= 1) {
        const term = englishTerms.get(stems.slice(at, at + size).join(' '));
        if (term) { term.split(' ').forEach((part, order) => out.push({ word: part, broken: broken && first && order === 0 })); first = false; break; }
      }
      at += Math.max(size, 1);
    }
    index = end;
  }
  return out;
}

// 이름 일치는 식별자로 쓴 때만이다(목표 64). "page title with a primary create button" 의 button 은 영어 낱말이지
// Button 을 부른 것이 아니다 — 예전 규칙은 소문자 포함만으로 +1000점을 줘 다른 후보가 이길 수 없었다.
// 질의 전체가 이름이면(대소문자·공백 무관) 이름 그대로다. 그 밖에는 "Button"·"DataTable" 처럼 적힌 그대로이거나,
// 두 낱말 이상인 이름(FilterBar ← "filter bar") 을 낱말 경계에서 쓴 것만 센다.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
function nameWeight(description, query, name) {
  if (query === normalize(name)) return 2000;
  const segments = name.match(/[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+/gu) ?? [name];
  const asWritten = new RegExp(`(?<![A-Za-z])${escapeRegExp(name)}(?![a-z]{2})`, 'u');
  const spaced = segments.length > 1 && new RegExp(`(?<![a-z])${segments.map(escapeRegExp).join('[\\s_-]*')}(?![a-z]{2})`, 'iu');
  return asWritten.test(description) || (spaced && spaced.test(description)) ? 1000 : 0;
}

// 흔한 낱말 키워드는 덜 친다(목표 64). '선택'은 선택 후보 59개 중 8개, '목록'은 10개 부품의 키워드 안에 있다 —
// '날짜'(1개)·'예정일'(1개) 같은 구체 낱말과 같은 20점을 주면 "출고 예정일 선택" 이 Checkbox 로 갔다.
// 연속으로 맞은 단일 낱말 키워드(20점)에 min(1, 4 / 그 낱말이 키워드에 든 부품 수) 를 곱한다.
// 구절(40)·질의 전체 일치(80)·떨어진 낱말(24·8)·목적·쓰임새 문장 점수는 그대로다. 문장 토큰에도 곱해 봤으나
// 정답 세트가 오르지 않고 R38 1순위만 2건 더 흔들려 쓰지 않는다(docs/qa/r38-match-ranking.md).
const SPECIFIC_WITHIN = 4;
const keywordCorpus = new WeakMap();
function specificity(components, keyword) {
  if (!keywordCorpus.has(components)) {
    keywordCorpus.set(components, { texts: components.filter(c => c.kind !== 'constant' && (!c.partOf || c.keywords?.length))
      .map(c => (c.keywords ?? []).map(normalize).join('|')), df: new Map() });
  }
  const corpus = keywordCorpus.get(components);
  const key = normalize(keyword);
  if (!corpus.df.has(key)) corpus.df.set(key, corpus.texts.filter(text => text.includes(key)).length);
  return Math.min(1, SPECIFIC_WITHIN / Math.max(1, corpus.df.get(key)));
}

// 구체적인 여러 낱말은 일반 키워드보다 강하다. 떨어진 일치는 연속 구절보다 낮게 친다.
// 한국어 키워드는 공백을 뺀 질의에 들어 있는지 본다(조사 결합 흡수). 라틴 키워드는 낱말 경계와 영어 줄기로 본다 —
// 'enter' 가 "center" 안에서 맞지 않게 한다.
function keywordMatch(source, keyword) {
  const { text, words, exactAllowed } = source;
  const latin = /^[\sA-Za-z0-9-]+$/u.test(keyword);
  const keywordWords = keyword.normalize('NFKC').trim().split(/[\s-]+/u).map(word => (latin ? stemEnglish(word.toLowerCase()) : normalize(word)));
  const phrase = keywordWords.join('');
  // 질의 전체 일치는 공백을 뺀 원문으로 본다 — "  p E e K  " 도 peek 이다.
  const exact = exactAllowed && (text === phrase || (latin && words.join('') === phrase));
  const contains = exact || (latin ? ` ${words.join(' ')} `.includes(` ${keywordWords.join(' ')} `) : text.includes(phrase));
  if (contains) {
    return { weight: phrase.length === 1 ? 4 : exact ? 80 : keywordWords.length > 1 ? 40 : 20, separated: false, words: keywordWords, phrase, exact };
  }
  // 모든 낱말이 있으면 후보로 남긴다. 조사 결합은 강하게, '실행' 안의 '행' 같은 내부 일치는 약하게 친다.
  // 한국어 낱말은 활용형 줄기도 본다 — '카드 불러오기' 는 "카드를 불러오는 동안" 에 있다(목표 64).
  if (keywordWords.length < 2) return null;
  const forms = keywordWords.map(word => (latin ? [word] : [word, ...koreanStems(word)]));
  if (!forms.every(options => options.some(form => (latin ? words.includes(form) : text.includes(form))))) return null;
  const positions = forms.map(options => words.findIndex(candidate => options.some(form => (latin ? candidate === form : candidate.startsWith(form)))));
  const ordered = positions.every(position => position >= 0) && positions.every((position, index) => index === 0 || position > positions[index - 1]);
  return { weight: ordered ? 24 : 8, separated: true, words: keywordWords, phrase, exact: false };
}

// 원문과 번역 중 더 센 일치를 쓴다. 질의 전체 일치(80)는 원문에서만 인정한다.
function bestMatch(sources, keyword) {
  let best = null;
  for (const source of sources) {
    const match = source.text && keywordMatch(source, keyword);
    if (match && (!best || match.weight > best.weight)) best = match;
  }
  return best;
}

export function matchComponents(description, components, limit = 5) {
  const query = normalize(description);
  if (!query) return [];
  const segments = segment(description);
  const tokens = segments.map(item => item.word);
  const translatedSegments = translate(segments);
  const translated = translatedSegments.map(item => item.word);
  const sources = [
    { text: query, words: tokens.map(word => (isLatin(word) ? stemEnglish(word) : word)), exactAllowed: true },
    { text: translatedSegments.map(item => (item.broken ? `|${item.word}` : item.word)).join(''), words: translated, exactAllowed: false },
  ];
  // 문장 토큰: 두 글자 이상·일반어 아님. 한국어는 조사·어미를 뗀 줄기도 함께 본다. 라틴 낱말은 번역으로만 비교한다.
  const sentenceWords = [...new Set([...tokens.filter(word => !isLatin(word)), ...translated])]
    .filter(word => word.length >= 2 && !GENERIC_WORDS.has(word));
  const selectable = (c) => c.kind !== 'constant' && (!c.partOf || (c.keywords?.length
    && (c.keywords.some(keyword => bestMatch(sources, keyword)) || nameWeight(description, query, c.name))));
  return components.filter(selectable).map((component) => {
    let score = 0;
    const reasons = [];
    const named = nameWeight(description, query, component.name);
    if (named) { score += named; reasons.push(`이름 일치: ${component.name} (+${named})`); }
    const keywordMatches = (component.keywords ?? []).map(keyword => ({ keyword, match: bestMatch(sources, keyword) })).filter(item => item.match);
    const contiguous = keywordMatches.filter(item => !item.match.separated);
    for (const { keyword, match } of keywordMatches) {
      // 같은 글자를 두 번 세지 않는다(목표 64). '주문 상태' 가 맞으면 그 안의 '상태' 는 더하지 않는다.
      if (!match.separated && !match.exact && contiguous.some(item => item.match.phrase !== match.phrase && item.match.phrase.includes(match.phrase))) continue;
      // '상태'와 떨어진 '상태 표시'는 같은 근거이므로 겹친 점수를 다시 더하지 않는다.
      const overlap = match.separated ? contiguous.filter(item => match.words.includes(item.match.phrase)).reduce((sum, item) => sum + item.match.weight, 0) : 0;
      const base = !match.separated && !match.exact && match.weight === 20 ? Math.round(20 * specificity(components, keyword)) : match.weight;
      const weight = Math.max(0, base - overlap);
      if (weight) { score += weight; reasons.push(`키워드 ${match.separated ? '낱말' : '일치'}: ${keyword} (+${weight})`); }
    }
    for (const [field, weight] of [['purpose', 2], ['useWhen', 5]]) {
      const text = normalize(Array.isArray(component[field]) ? component[field].join(' ') : component[field] ?? '');
      const matches = [...new Set(sentenceWords.map(word => [word, ...koreanStems(word)].find(candidate => text.includes(candidate))).filter(Boolean))];
      if (matches.length) { score += matches.length * weight; reasons.push(`${field}: ${matches.join(', ')} (+${matches.length * weight})`); }
    }
    // 조립 항목(목표 75 3단계)은 import 할 수 없으니 kind 로 알린다. 부품 후보의 응답 모양은 그대로다.
    return { name: component.name, ...(component.kind === 'pattern' ? { kind: 'pattern' } : {}), score, reasons,
      purpose: component.purpose, useWhen: component.useWhen, dont: component.dont };
    // purpose 한 토큰(2점)만 맞은 것은 매칭 근거가 못 된다. 조사·일반어가 우연히 겹친다 —
    // "zzzz 아무 관련 없는 말" 이 AlertDialog 의 "되돌릴 수 없는" 과 '없는' 으로 붙었다.
  }).filter((c) => c.score > 2).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'en')).slice(0, limit);
}
