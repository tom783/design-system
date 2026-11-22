// 파서가 알 수 없는 선택 의도만 소유한다. 이름·props·slots·출처는 mcp-build가 소스와 대조한다.
const rule = (text, section) => ({ text, source: `DESIGN.md ${section}` });
const entry = (name, category, purpose, useWhen, dont, section, text, props, slots, related, keywords) => ({
  name, category, purpose, useWhen, dont, rules: (Array.isArray(text) ? text : [text]).map(item => typeof item === 'string' ? rule(item, section) : item), props, slots, related, keywords,
});
// 부품 관계는 이름이 아니라 각 선언의 부모 인자로 정한다. 로딩 프리셋은 독립 항목이다.
const part = (name, partOf, purpose, props, slots) => ({ name, partOf, purpose, props, slots });
export const principles = [
  { topic: '색', ...rule('원시 색 대신 의미 토큰을 쓴다. 상태·오류는 실루엣이 다른 아이콘 + 문장 + 색으로 전달한다. 링크는 밑줄을 쓴다.', '2.4') },
  { topic: '색', ...rule('본문 대비 4.5:1, 큰 글자·비텍스트 3:1 이상. 비활성 스타일에 읽어야 하는 정보를 담지 않는다.', '3.4') },
  { topic: '색', ...rule('토큰은 :root 기본값과 OS 테마·명시적 라이트·명시적 다크를 모두 지원한다.', '2.5') },
  { topic: '타이포', ...rule('최소 글자 크기는 13px. font-size는 text-[length:var(--토큰)]으로 명시한다.', '3.1') },
  { topic: '타이포', ...rule('열로 정렬하는 숫자와 금액은 .tabular 고정폭 숫자를 쓴다.', '3.3') },
  { topic: '간격', ...rule('Tailwind 기본 --spacing 배수를 덮어쓰지 않는다. --space-*는 var()로 직접 쓴다. 값은 최소 너비 + 넘침 처리 + 전체값 보존으로 배치한다.', '4') },
  { topic: '간격', ...rule('평면 요소는 그림자 없이 경계선·여백으로 나눈다. 그림자는 떠 있는 레이어에만 쓴다. reduced-motion을 존중한다.', '5') },
  { topic: '간격', ...rule('앱 CSS 클래스는 ds-로 시작하지 않으며, .flex·.hidden 같은 유틸리티 이름을 다시 정의하지 않는다.', '6') },
  { topic: '폼', ...rule('입력 경계는 border-field. 주요 버튼은 화면당 하나, 아이콘 전용 버튼은 aria-label 필수다.', '6') },
  { topic: '폼', ...rule('IME 조합 중 값 변형·포커스 이동·검증 금지. 최초 검증은 blur, 오류 후 change에서 즉시 해제하고 제출 때만 첫 오류로 이동한다.', '11.2') },
  { topic: '폼', ...rule('레이블 → 설명 → 입력 → 오류 순서. 오류 공간을 예약하고 aria-describedby는 오류부터 읽는다.', '11.4') },
  { topic: '폼', ...rule('Enter 이동은 FormFlow 옵트인. Tab 순서를 따른다. textarea Enter·Shift+Enter는 줄바꿈, 단일 행 Shift+Enter는 이전 칸이다. data-form-control=advance는 값 변경 없이 이동하며 단일 Combobox는 선택 후 이동하며 MultiSelect·multiple은 선택 뒤 머문다.', '11.5') },
  { topic: '로딩', ...rule('짧은 대기에는 로딩 표시를 지연한다. 400ms~3초에는 형태를 아는 경우만 스켈레톤, 긴 대기는 진행률과 대략적 시간을 제공한다.', '9.1') },
  { topic: '로딩', ...rule('스켈레톤은 실제 콘텐츠와 같은 치수·토큰을 쓴다. 형태를 모르면 쓰지 않는다. 텍스트 높이는 글자 높이 약 0.65em, 마지막 줄은 짧게 한다.', '9.2') },
  { topic: '안내', ...rule('Tooltip은 한 줄 UI 설명, Hint는 한 번 알리는 2~3줄, Tour는 사용자가 시작하는 최대 3단계다. 자동 투어와 건너뛰기 차단 금지.', '10.2') },
  { topic: '안내', ...rule('Tooltip은 포커스를 가져가지 않는다. Hint·Tour는 dialog로 포커스를 옮겼다가 닫을 때 돌려준다. 투어는 포커스를 가두지 않는다.', '10.4') },
  { topic: '안내', ...rule('Peek은 UI 안내가 아닌 레코드 요약이다. 클릭으로만 열고 최대 6줄, 수정·삭제 없이 상세 보기 출구 하나만 둔다.', '12.1') },
  { topic: '차트', ...rule('SVG와 의미 토큰을 쓴다. 색만으로 구분하지 않고 직접 라벨·텍스트 요약을 제공한다.', '7.5.3') },
  { topic: '차트', ...rule('빈 데이터와 실패를 구분하고 실패를 0으로 표시하지 않는다.', '7.5.6') },
  { topic: '표', ...rule('기본 행 높이와 밀도 토큰을 사용한다. 금액은 우측 정렬·고정폭 숫자. 값에 고정 너비를 주지 않고 전체값을 보존한다.', '4') },
  { topic: '표', ...rule('재방문 행은 네 번째 배경색 대신 왼쪽 마커를 쓴다. 복원 기록은 일회성·10분 TTL이며 스크롤 복원은 앱이 맡는다.', '12.3') },
];
const intents = [
  entry('Steps','form','여러 단계 폼의 현재 위치와 완료·오류·예정을 표시한다.',
    ['상품 등록·캠페인 생성·입점 신청을 주제별로 나눌 때'],
    ['장기 작업 진행은 TaskProgress를 쓴다','폼 상태·검증·이동 버튼은 앱이 맡는다'],'11.8',[
      'current는 steps 배열의 0 기준 인덱스다. 라벨·선택 description과 status:error로 오류를 표시한다.',
      '완료 단계만 onStepClick(index)으로 돌아간다. 예정·현재·오류 단계로 건너뛰지 않는다.',
      'ol과 aria-current=step, 단계 이름의 상태 문구를 제공한다. 완료·오류는 다른 아이콘과 글자로 구분한다.',
      '640px 미만은 현재 위치 요약이다. 앱의 이전 버튼을 제공한다. 긴 라벨은 전체값을 보존한다.',
      '단계마다 FormFlow 하나를 렌더하고 이동 뒤 앱이 새 단계 제목에 포커스한다.'
    ],['steps','current','onStepClick'],['steps','steps-list','steps-item','steps-marker','steps-content','steps-heading','steps-count','steps-label','steps-status','steps-description','steps-button','steps-static'],
    ['FormFlow','TaskProgress'],['단계','스텝','진행 단계','여러 단계 폼','1단계 2단계']),
  entry('SegmentedControl','navigation','화면 보기와 기간·지표 단위를 즉시 바꾸는 단일 선택이다.',
    ['표·카드 보기 전환, 일·주·월 기간 단위, 차트 지표를 즉시 바꿀 때'],
    ['패널 전환은 Tabs, 제출할 폼 값은 RadioGroup을 쓴다','다중 선택에는 쓰지 마라'],'17.7',[
      '그룹에 aria-label 또는 보이는 라벨의 aria-labelledby를 준다. options의 value는 고유하고 label은 필수다.',
      '항목은 value·label·선택 icon·disabled다. iconOnly에서도 label을 생략하지 않는다.',
      'value·onValueChange는 제어형, defaultValue는 비제어형이다. 생략하면 첫 활성 항목이 선택된다.',
      '화살표는 활성 항목을 순환하며 즉시 선택한다. Home·End는 처음·끝, Tab은 그룹에 한 번 도달한다.',
      'size는 sm·md, fullWidth는 같은 폭으로 채운다. 좁으면 한 줄 말줄임하며 전체 라벨을 보존한다.'
    ],['options','value','defaultValue','onValueChange','size','fullWidth','iconOnly','disabled','aria-label','aria-labelledby'],
    ['segmented-control','segmented-control-item','segmented-control-icon','segmented-control-label'],
    ['Tabs','RadioGroup'],['보기 전환','기간 단위','일 주 월','토글 그룹','세그먼트','차트 지표 전환']),
  entry('FileUpload','form','파일을 고르고 검증하며 미리보기·목록·전송 상태를 표시한다.',['CMS 대표 이미지·상품 이미지·엑셀 일괄 등록·첨부 파일을 고를 때'],['전송·재시도·취소는 앱이 맡는다','붙여넣기·폴더 업로드·이미지 편집에는 쓰지 마라'],'11.7',[
    'value·onValueChange에 항목 목록을 연결한다. 항목은 id·file과 선택 status·progress·error를 갖는다.',
    'status는 ready·uploading·success·error, progress는 0~1이다. error에는 실패 이유와 고치는 방법을 쓴다.',
    'accept·maxSize(바이트)·multiple·maxFiles로 선택을 제한한다. 거절된 파일은 목록에 추가되지 않는다.',
    'mode=image는 단일 대표 이미지의 미리보기·바꾸기·삭제를 제공한다.',
    'Field로 레이블·설명을 준다. 선택 거절은 Field 오류 자리, 전송 실패는 해당 파일 옆에 표시된다.'
  ],['value','onValueChange','accept','maxSize','multiple','maxFiles','mode','disabled','label'],['file-upload','file-upload-input','file-upload-trigger','file-upload-dropzone','file-upload-list','file-upload-item','file-upload-name','file-upload-size','file-upload-error','file-upload-item-error','file-upload-announcement'],['Thumbnail','ProgressTrack','Field','Button','StatusChip'],['파일 업로드','이미지 업로드','첨부','드래그 앤 드롭','대표 이미지','엑셀 업로드']),
  entry('Pagination','navigation','목록의 페이지를 옮기고 표시 범위·전체 건수·페이지 크기를 확인한다.',['주문·출고·게시글을 서버에서 페이지 단위로 조회할 때'],['여러 페이지의 선택 ID를 누적해 일괄 처리하지 마라'],'4.1',[
    'DataTable 아래에 따로 둔다. 표에는 현재 페이지 data와 전체 totalCount를 전달한다.',
    'page는 1부터 시작한다. page·pageSize·totalCount와 변경 콜백은 앱 상태에 연결한다.',
    'pageSizeOptions와 onPageSizeChange를 함께 준다. 크기 변경은 새 크기와 1페이지를 함께 조회에 반영한다.',
    '조회 중에는 disabled를 주고 표는 state="loading"으로 둔다. 새 응답 전까지 기존 선택은 유지된다.',
    '0건이면 숨고 한 페이지면 범위만 표시한다. 좁은 폭에서는 이전·다음과 현재 위치를 표시한다.',
    'URL 동기화와 서버 조회는 앱이 맡는다. 여러 페이지 일괄 처리는 서버의 조건 전체 선택으로 설계한다.'
  ],['page','pageSize','totalCount','onPageChange','pageSizeOptions','onPageSizeChange','disabled'],['pagination','pagination-range','pagination-controls','pagination-page','pagination-position','pagination-previous','pagination-next','pagination-size','pagination-pages','pagination-ellipsis'],['DataTable','Select','Button','EmptyState'],['페이지','페이징','페이지 이동','페이지 크기','몇 개씩']),
  entry('AppShell','layout','사이드 메뉴와 본문을 같은 업무 화면 틀로 배치한다.',['제품의 공통 화면 틀을 구성할 때'],['본문 안에 main을 다시 넣지 마라'],'24',[
    'sidebar에는 SideNav를 넣는다. header에는 앱의 전역 검색·사용자 메뉴를 구성할 수 있다.',
    '본문·건너뛰기 링크와 여백(24px, 좁으면 16px)은 내장이다. 페이지 루트에 padding을 다시 주지 않는다. 화면 요소 사이는 gap 24px.',
    '본문은 기본 최대 폭 제한이 없다. 필요한 화면만 contentMaxWidth를 지정한다.',
    'narrowNavigation=drawer는 1024px 미만에서 메뉴 버튼·왼쪽 Sheet를 쓴다. 항목 선택 시 닫히며 기본은 rail이다.',
    '높이 기본값은 화면 전체다. 다른 영역에 넣을 때는 style로 높이를 지정한다.'
  ],['sidebar','header','children','contentMaxWidth','narrowNavigation'],['app-shell','app-shell-main','app-shell-skip','app-shell-header','app-shell-content'],['SideNav','PageHeader'],['앱 셸','공통 화면','레이아웃','사이드바와 본문','화면 틀']),
  entry('SideNav','navigation','브랜드와 그룹별 메뉴로 현재 위치와 이동 경로를 보여준다.',['사이드바에 제품 메뉴를 배치할 때'],['출시 예정 항목에 이동 동작을 넣지 마라'],'24',[
    'SideNavGroup으로 묶고 SideNavItem에 icon·label을 준다. 현재 위치는 current로 표시한다.',
    '다른 링크 컴포넌트를 쓰면 SideNavItem의 asChild 안에 단일 링크를 넣는다.',
    'collapsed·onCollapsedChange는 제어형, defaultCollapsed는 비제어형이다. 접힘 상태 저장은 앱이 맡는다.',
    '펼침은 240px, 접힘은 64px다. 1024px 미만에서는 자동으로 접히고 넓어지면 사용자의 선택으로 돌아온다.',
    '접힌 항목은 호버·포커스에서 라벨을 보여준다. disabled는 출시 예정 표시와 함께 이동·Tab 탐색을 막는다.',
    'brand는 제품명, brandIcon은 접힌 상태에서도 남는 브랜드 표식이다. badge로 개수 등을 표시한다.'
  ],['brand','brandIcon','collapsed','onCollapsedChange','defaultCollapsed'],['side-nav','side-nav-menu','side-nav-toggle'],['AppShell','PageHeader'],['사이드바','메뉴','내비게이션','사이드 메뉴','브랜드','왼쪽 메뉴']),
  part('SideNavGroup','SideNav','사이드 메뉴 항목을 제목으로 묶는다.',['label','children'],['side-nav-group','side-nav-group-label']),
  part('SideNavItem','SideNav','아이콘·라벨·개수와 현재 위치 또는 출시 예정 상태를 표시한다.',['icon','label','badge','current','disabled','asChild','href'],['side-nav-item','side-nav-item-label','side-nav-badge']),
  entry('PageHeader','layout','페이지 제목과 설명·상태·주요 액션을 같은 위치에 배치한다.',['페이지 제목이나 화면 머리를 구성할 때'],['한 페이지에 PageHeader를 여러 개 넣지 마라'],'24',[
    'title은 페이지의 h1이다. 같은 제목을 다시 만들지 않는다. 바깥 여백이 없다. 아래 요소와의 간격은 페이지 배치(gap)로 준다.',
    'breadcrumb에는 Breadcrumb, status에는 StatusChip 등을 넣는다. actions에는 화면의 주요 버튼을 둔다.',
    '본문 폭이 640px 미만이면 액션이 제목 아래로 내려간다. 주요 버튼은 하나만 둔다.'
  ],['title','description','breadcrumb','status','actions'],['page-header','page-header-title','page-header-description','page-header-breadcrumb','page-header-status','page-header-actions'],['AppShell','Breadcrumb','StatusChip','Button'],['페이지 제목','화면 머리','페이지 머리','제목과 버튼','페이지 헤더']),
  entry('Carousel','media',"배너·콘텐츠 슬라이드를 한 장씩 넘겨 보여준다.",['배너 슬라이드','콘텐츠를 한 장씩 가로로 넘길 때'],["Swiper·Embla 같은 캐러셀 라이브러리를 함께 쓰지 마라", "자동재생 정지 버튼을 숨기거나 사용자 조작 후 재개하지 마라"],'23',[
    rule("슬라이드는 CarouselSlide로 감싼다.", "23.1"),
    rule("양 끝에서는 멈춘다. 앱이 순환 이동을 덧붙이지 않는다.", "23.1"),
    rule("autoplay의 정지 버튼은 내장되어 있다. 따로 만들지 않는다.", "23.2"),
    rule("사용자가 직접 넘기거나 슬라이드 안을 누르면 자동재생이 종료된다. 앱이 재시작하지 않는다.", "23.2"),
    rule("호버·내부 포커스·숨겨진 탭의 일시 정지는 내장되어 있다. 별도 타이머를 만들지 않는다.", "23.2"),
    rule("동작 줄이기 설정이 끈 자동재생·부드러운 넘김을 앱이 다시 켜지 않는다.", "23.3")
  ],['label','children','autoplay','showArrows','showDots'],['carousel','carousel-track','carousel-controls','carousel-previous','carousel-next','carousel-dots','carousel-dot','carousel-pause','carousel-announcement','carousel-stopped'],['MediaViewer'],['캐러셀','배너','슬라이드','슬라이더','자동 넘김','가로 스크롤','배너 슬라이드']),
  part('CarouselSlide','Carousel','캐러셀 안의 콘텐츠 한 장을 표시한다.',[],['carousel-slide']),
  entry('MediaViewer','media','이미지 확대와 동영상 팝업·플로팅 표시를 제공한다.',['이미지 크게 보기','영상 보면서 작업','이미지나 영상을 확대해서 볼 때'],["영상 재생 컨트롤을 따로 만들거나 자동 재생을 붙이지 마라", "pan·zoom·끌어서 옮기기가 필요하면 다른 도구를 쓴다"],'22',[
    rule("영상을 보며 바깥 화면에서 작업해야 하면 mode=floating을 쓴다.", "22.1"),
    rule("닫기 버튼·패널 안 Escape 닫기를 중복 구현하지 않는다.", "22.1"),
    rule("이미지에는 내용을 설명하는 alt를 준다.", "22.2"),
    rule("영상에 poster·captions를 제공하고 내장 재생 컨트롤을 쓴다.", "22.2"),
    rule("PiP를 금지할 영상에는 disablePictureInPicture를 준다.", "22.3")
  ],['media','open','onOpenChange','mode','placement','title'],['media-viewer','media-viewer-stage','media-viewer-image','media-viewer-video','media-viewer-pip','media-viewer-close'],['Dialog','Thumbnail','Skeleton','ErrorState'],['이미지 확대','라이트박스','사진 크게','동영상 재생','영상 팝업','떠 있는 창','화면 속 화면','PiP','이미지 크게 보기','영상 보면서 작업']),
  entry('Collapsible','disclosure',"고급 설정 같은 내용을 항상 보이는 버튼으로 접고 펼친다.",['고급 설정 접기','패널을 접고 펼칠 때'],['긴 글의 줄 제한에는 ClampText를 쓴다','아코디언으로 쓰지 마라'],'21',[
    "트리거 라벨은 앱이 제공한다.",
    "닫힌 입력값·자식 상태를 보존하려면 CollapsibleContent에 forceMount를 준다."
  ],['open','defaultOpen','onOpenChange','disabled'],['collapsible'],['ClampText'],['접기','펼치기','아코디언 아님','고급 설정','고급 설정 접기']),
  part('CollapsibleTrigger','Collapsible',"항상 보이는 버튼으로 내용을 접고 펼친다.",['asChild'],['collapsible-trigger']),
  part('CollapsibleContent','Collapsible',"접고 펼칠 내용을 담는다.",['forceMount'],['collapsible-content']),
  entry('ClampText','disclosure','긴 글을 N줄로 자르고 넘칠 때만 더보기·간략히를 제공한다.',['상품 설명·비고 등 긴 설명 더보기'],["링크·입력 등 조작할 요소를 접을 때는 Collapsible을 쓴다", "DataTable 셀에 쓰지 마라. 셀이 말줄임과 전체 값 title 을 이미 제공한다"],'21',[
    "넘칠 때만 생기는 더보기 버튼을 중복 구현하지 않는다.",
    "전체 글은 DOM에 남아 복사된다. 복사용 글을 따로 만들지 않는다.",
    "펼침을 제어하려면 expanded·onExpandedChange를 함께 준다."
  ],['lines','expanded','onExpandedChange','moreLabel','lessLabel'],['clamp-text','clamp-text-content','clamp-text-trigger'],['Collapsible'],['더보기','간략히','말줄임','긴 글','긴 설명 더보기']),
  entry('Combobox','form','많은 옵션에서 검색해 단일 값 또는 multiple로 여러 개를 고른다.',['20개를 넘는 후보에서 타이핑으로 찾을 때','초성으로 찾기','검색해서 여러 개 고르기'],["한글 조합 중 값을 바꾸거나 선택·포커스 이동을 추가하지 마라", "가상 스크롤이 필요하면 다른 도구를 쓴다"],'18',[
    rule("기본 초성·자모 검색을 바꾸려면 filter를 준다.", "18.2"),
    rule("조합 중 결과 없음은 내장 처리된다. 앱이 빈 결과를 따로 표시하지 않는다.", "18.2"),
    rule("500개 초과 후보는 앱 서버에서 거른다.", "18.1"),
    rule("multiple에는 value와 onValueChange로 string[]을 주고받는다.", "20.2"),
    rule("태그는 2줄 뒤 내부 스크롤한다. 앱이 선택 수마다 높이를 늘리지 않는다.", "20.2"),
    rule("빈 입력 Backspace는 두 번 눌러 태그를 지운다. 앱이 즉시 삭제를 덧붙이지 않는다.", "20.2"),
    rule("multiple은 선택 뒤에도 머문다. 앱이 닫거나 다음 칸으로 보내지 않는다.", "20.2"),
    rule("검색 없이 여러 개를 고를 때는 MultiSelect를 쓴다.", "20.1"),
    rule("FormFlow 안 단일 선택은 고르면 다음 칸으로 간다. 별도 포커스 이동을 붙이지 않는다.", "11.5"),
    rule("트리거에 data-form-control=advance를 붙이지 않는다.", "11.5"),
    rule("폼 밖 선택·Escape는 트리거로 돌아간다. 포커스를 다시 옮기지 않는다.", "11.5")
  ],['multiple','options','value','onValueChange','placeholder','searchPlaceholder','emptyText','filter','disabled','invalid','maxHeight'],['combobox-trigger','combobox-input','combobox-list','combobox-option','combobox-empty'],['Select','MultiSelect','Field'],['콤보박스','자동완성','검색 선택','많은 옵션','초성 검색','목록에서 찾기','타이핑으로 찾기','초성으로 찾기','많은 옵션에서 검색해 선택','검색해서 여러 개 고르기','태그 선택']),
  entry('MultiSelect','form',"요약 트리거와 체크 목록으로 여러 값을 고른다.",['여러 사업장 고르기','검색 없이 여러 개 선택할 때'],['검색은 Combobox multiple을 쓴다','고를 때 닫거나 data-form-control=advance를 붙이지 마라'],'20',[
    rule("선택 수가 늘어도 트리거 높이는 같다. 태그가 필요하면 Combobox multiple을 쓴다.", "20.1"),
    rule("선택 뒤에도 머문다. 앱이 닫거나 다음 입력으로 보내지 않는다.", "20.1"),
    rule("전체 해제·선택 개수를 중복 구현하지 않는다.", "20.1")
  ],['options','value','onValueChange','placeholder','summary','clearLabel','disabled','invalid','required','maxHeight'],['multi-select-trigger','multi-select-list','multi-select-option','multi-select-footer'],['Select','Combobox','Field'],['다중 선택','여러 개 선택','복수 선택','태그 선택','체크 목록','여러 사업장 고르기']),
  entry("Tabs","navigation","상세 정보를 탭별 패널로 나눠 보여준다.",["상세 화면을 분류별 패널로 나눌 때"],["서버 조회 패널을 automatic으로 두지 마라","화면 보기·기간 단위의 즉시 전환은 SegmentedControl을 쓴다"],"16",[
    rule("서버 데이터를 조회하는 패널에는 activationMode=manual을 준다.", "16.1"),
    rule("넘치는 탭은 컴포넌트가 끌어온다. 줄바꿈하거나 스크롤바를 숨기지 않는다.", "16.1")
  ],["value", "defaultValue", "onValueChange", "activationMode"],["tabs"],["TabsList", "TabsTrigger", "TabsContent", "SegmentedControl", "RadioGroup"],["탭", "탭으로 나누기", "분류별 패널"]),
  part("TabsList", "Tabs", "탭 헤더를 한 줄로 배치하고 넘치면 스크롤한다.", ["aria-label"], ["tabs-list"]),
  part("TabsTrigger", "Tabs", "패널을 선택하는 탭 버튼이다.", ["value", "disabled"], ["tabs-trigger"]),
  part("TabsContent", "Tabs", "선택한 상세 패널을 표시한다.", ["value"], ["tabs-content"]),
  entry("Breadcrumb","navigation","목록으로 돌아가는 경로를 빵부스러기로 표현한다.",["상세에서 상위 목록과 뒤로 가는 경로가 필요할 때"],["필터·스크롤 복원이 자동으로 된다고 가정하지 마라"],"16",[
    rule("마지막 항목에는 링크 대신 BreadcrumbPage를 쓴다.", "16.2"),
    rule("긴 경로는 첫 항목·BreadcrumbEllipsis·마지막 둘로 조립한다.", "16.2"),
    rule("앱이 consume으로 기록을 읽고 필터·스크롤·재방문 행을 복원한다.", "16.2")
  ],["aria-label"],["breadcrumb"],["BreadcrumbList", "BreadcrumbPage"],["경로", "빵부스러기", "뒤로", "목록으로 돌아가는 경로"]),
  part("BreadcrumbList", "Breadcrumb", "경로 항목의 순서 목록이다.", [], ["breadcrumb-list"]),
  part("BreadcrumbItem", "Breadcrumb", "경로의 개별 항목이다.", [], ["breadcrumb-item"]),
  part("BreadcrumbLink", "Breadcrumb", "라우터를 지정하지 않는 상위 경로 링크다.", ["asChild", "href"], ["breadcrumb-link"]),
  part("BreadcrumbPage", "Breadcrumb", "링크가 아닌 현재 경로 항목이다.", ["aria-current"], ["breadcrumb-page"]),
  part("BreadcrumbSeparator", "Breadcrumb", "보조기기가 읽지 않는 경로 구분자다.", [], ["breadcrumb-separator"]),
  part("BreadcrumbEllipsis", "Breadcrumb", "접힌 경로 수를 읽을 수 있는 생략 표시다.", ["count"], ["breadcrumb-ellipsis"]),
  entry("Dialog","overlay","입력·편집·선택을 모달로 제공한다.",["되돌릴 수 있는 입력이나 편집을 팝업으로 띄울 때"],["삭제 확인에는 AlertDialog, 목록 맥락을 유지하는 상세·편집에는 SheetContent를 사용한다"],"16",[
    rule("DialogTitle·DialogDescription → 내용 → 푸터 순서로 배치한다.", "16.3"),
    rule("설명이 없으면 Content에 aria-describedby={undefined}를 준다.", "16.3"),
    rule("첫 요소로 포커스가 가므로 파괴적 버튼을 맨 앞에 두지 않는다.", "16.3"),
    rule("저장하지 않은 변경에는 dismissible=false·onDismissAttempt로 확인 AlertDialog를 연다. Escape도 확인을 거친다.", "16.3")
    ,rule("SheetContent는 Dialog 안에 두고 DialogHeader·Title·Description·Footer·Close를 공유한다. SheetBody만 스크롤한다.", "16.6")
  ],["open", "onOpenChange"],[],["DialogContent", "SheetContent", "AlertDialog", "Peek"],["모달", "모달 띄우기", "다이얼로그", "팝업", "편집"]),
  part("DialogTrigger", "Dialog", "입력 창을 여는 트리거다.", ["asChild"], ["dialog-trigger"]),
  part("DialogContent", "Dialog", "입력 창의 내용과 닫기 보호를 제공한다.", ["size", "dismissible", "onDismissAttempt", "onEscapeKeyDown", "onPointerDownOutside", "onInteractOutside"], ["dialog-content", "dialog-overlay"]),
  { ...part('SheetContent', 'Dialog', '목록 맥락을 유지하는 모달 옆 패널이다. side는 right·left, size는 sm 400·md 560·lg 720px다.',
    ['side','size','dismissible','onDismissAttempt','showClose'], ['sheet-content','dialog-overlay']),
    useWhen: ['목록에서 상세·편집·필터를 열거나 좁은 화면 메뉴를 서랍으로 열 때'],
    dont: ['가운데 확인·짧은 입력은 DialogContent, 읽기 전용 요약은 Peek을 쓴다'],
    related: ['DialogContent','SheetBody','Peek'],
    keywords: ['옆 패널','사이드 패널','서랍','드로어','슬라이드 패널'] },
  part('SheetBody', 'Dialog', 'SheetContent의 스크롤 본문이다. 헤더·푸터는 이 바깥에 둔다.', [], ['sheet-body']),
  part("DialogHeader", "Dialog", "입력 창 제목·설명 그룹이다.", [], ["dialog-header"]),
  part("DialogTitle", "Dialog", "입력 창의 필수 제목이다.", [], ["dialog-title"]),
  part("DialogDescription", "Dialog", "입력 창의 필수 설명이다.", [], ["dialog-description"]),
  part("DialogFooter", "Dialog", "입력 창 하단의 액션 그룹이다.", [], ["dialog-footer"]),
  part("DialogClose", "Dialog", "입력 창을 닫는 버튼을 제공한다.", ["asChild"], ["dialog-close"]),
  entry("AlertDialog","overlay","삭제 확인 등 되돌릴 수 없는 선택을 요구하는 확인창이다.",["영구 삭제·작성 취소 확인이 필요할 때"],["폼을 넣지 마라. 입력은 Dialog다", "Cancel을 생략하지 마라"],"16",[
    rule("Cancel이 초기 포커스를 받는다. 앱이 파괴적 액션으로 옮기지 않는다.", "16.4"),
    rule("바깥 클릭은 유지, Escape는 닫기다. 앱이 덮어쓰지 않는다.", "16.4")
  ],["open", "onOpenChange"],[],["AlertDialogContent", "AlertDialogCancel", "Dialog"],["확인창", "삭제 확인", "되돌릴 수 없", "취소 확인"]),
  part("AlertDialogTrigger", "AlertDialog", "확인 창을 여는 트리거다.", ["asChild"], ["alert-dialog-trigger"]),
  part("AlertDialogContent", "AlertDialog", "되돌릴 수 없는 선택을 확인하는 내용을 표시한다.", [], ["alert-dialog-content", "alert-dialog-overlay"]),
  part("AlertDialogHeader", "AlertDialog", "확인 제목·설명 그룹이다.", [], ["alert-dialog-header"]),
  part("AlertDialogTitle", "AlertDialog", "확인 창의 필수 제목이다.", [], ["alert-dialog-title"]),
  part("AlertDialogDescription", "AlertDialog", "되돌릴 수 없는 결과의 설명이다.", [], ["alert-dialog-description"]),
  part("AlertDialogFooter", "AlertDialog", "확인·취소 액션 그룹이다.", [], ["alert-dialog-footer"]),
  part("AlertDialogAction", "AlertDialog", "확인한 작업을 실행하고 확인창을 닫는다.", ["variant"], ["alert-dialog-action"]),
  part("AlertDialogCancel", "AlertDialog", "초기 포커스를 받는 필수 취소 버튼이다.", [], ["alert-dialog-cancel"]),
  ...[
    ['Select', '상태·정렬 필터에서 하나를 고른다.', [], null],
    ['SelectTrigger', "선택 목록을 연다.", ['select-trigger'], 'Select'],
    ['SelectValue', "선택값이나 플레이스홀더를 표시한다.", ['select-value'], 'Select'],
    ['SelectContent', '선택할 옵션 목록을 표시한다.', ['select-content'], 'Select'],
    ['SelectGroup', "관련 선택 항목을 묶는다.", ['select-group'], 'Select'],
    ['SelectLabel', "선택 그룹의 이름을 표시한다.", ['select-label'], 'Select'],
    ['SelectItem', "선택 옵션 하나를 표시한다.", ['select-item'], 'Select'],
    ['SelectSeparator', "선택 그룹을 구분한다.", ['select-separator'], 'Select'],
    ['SelectScrollUpButton', "선택 목록을 위로 넘긴다.", ['select-scroll-up-button'], 'Select'],
    ['SelectScrollDownButton', "선택 목록을 아래로 넘긴다.", ['select-scroll-down-button'], 'Select'],
  ].map(([name, purpose, slots, partOf]) => partOf ? part(name, partOf, purpose, [], slots) : entry(name, 'form', purpose, ['20개 이하의 상태·정렬 옵션을 선택할 때'], ['20개 초과는 Combobox를 사용한다'], '11.4', 'Field에는 SelectTrigger를 넣는다. 선택 키 처리는 컴포넌트에 맡긴다. 필터 줄에서는 SelectTrigger에 폭을 지정한다(기본은 칸을 채운다).', [], slots, ['Field', 'Combobox', 'MultiSelect'], ['선택 필터', '셀렉트', '상태 필터', '20개 이하'])),
  ...[
    ['DropdownMenu', "행에서 실행할 액션을 메뉴로 제공한다.", [], null],
    ['DropdownMenuTrigger', "행 액션 메뉴를 연다.", ['dropdown-menu-trigger'], 'DropdownMenu'],
    ['DropdownMenuContent', '실행할 액션 목록을 표시한다.', ['dropdown-menu-content'], 'DropdownMenu'],
    ['DropdownMenuItem', "메뉴 액션 하나를 실행한다.", ['dropdown-menu-item'], 'DropdownMenu'],
    ['DropdownMenuCheckboxItem', "메뉴에서 켜고 끌 항목을 표시한다.", ['dropdown-menu-checkbox-item'], 'DropdownMenu'],
    ['DropdownMenuRadioItem', "메뉴에서 하나만 고를 항목을 표시한다.", ['dropdown-menu-radio-item'], 'DropdownMenu'],
    ['DropdownMenuLabel', "메뉴 그룹 이름을 표시한다.", ['dropdown-menu-label'], 'DropdownMenu'],
    ['DropdownMenuSeparator', "메뉴 그룹을 구분한다.", ['dropdown-menu-separator'], 'DropdownMenu'],
    ['DropdownMenuShortcut', "메뉴의 단축키를 표시한다.", ['dropdown-menu-shortcut'], 'DropdownMenu'],
    ['DropdownMenuGroup', "관련 메뉴 항목을 묶는다.", [], 'DropdownMenu'],
    ['DropdownMenuPortal', '메뉴를 다른 화면 요소 위에 표시한다.', [], 'DropdownMenu'],
    ['DropdownMenuSub', "하위 메뉴를 제공한다.", [], 'DropdownMenu'],
    ['DropdownMenuSubContent', "하위 메뉴 목록을 표시한다.", ['dropdown-menu-sub-content'], 'DropdownMenu'],
    ['DropdownMenuSubTrigger', "하위 메뉴를 연다.", ['dropdown-menu-sub-trigger'], 'DropdownMenu'],
    ['DropdownMenuRadioGroup', "메뉴에서 하나만 고를 항목을 묶는다.", [], 'DropdownMenu'],
  ].map(([name, purpose, slots, partOf]) => partOf ? part(name, partOf, purpose, [], slots) : entry(name, 'action', purpose, ['표의 행에서 액션을 실행할 때'], ['파괴적 항목을 색만으로 구분하지 마라'], '2.3', ['destructive 항목에는 삭제 아이콘을 함께 표시한다.', '행 작업: Button(ghost·sm·iconOnly)+Ellipsis(@s2life/ui/icons), aria-label=행 식별+작업. 열 제목은 sr-only 작업.'], [], slots, ['DataTable'], ['행 메뉴', '드롭다운 액션'])),
  entry('Toaster', 'status', '저장·오류 알림을 표시한다.', ['사용자 작업 결과를 알릴 때'], ['오류를 자동으로 지우지 마라'], '2.5',['toast.error는 닫기 버튼을 누를 때까지 남는다. duration을 줘도 바뀌지 않는다.'], [], ['toaster'], ['Button'], ['토스트', '저장 알림']),
  entry('DatePicker', 'form', '한국어 단일 날짜·일시·기간 입력과 빠른 선택을 제공한다.', ['주문·물류 목록의 기간 필터가 필요할 때'], ['IME 조합 중 날짜를 파싱하지 마라'], '11.1',[
    "onChange로 받은 확정 날짜를 쓴다. 입력 중 초안을 매 키마다 날짜로 바꾸지 않는다.",
    rule('예약·발송·캠페인은 single 전용 time(기본 10분). 최근접 분 칸·동률 올림, 첫 시각 09:00. 브라우저 지역 시간이며 ISO·UTC 변환은 앱 몫이다.', '11.1.1')
  ], ['mode', 'time', 'value', 'onChange', 'today', 'defaultMonth'], ['date-picker', 'date-picker-error', 'date-picker-presets', 'date-picker-time', 'date-picker-notice'], ['Field'], ['날짜', '기간 필터', '달력', '날짜 시간', '시각', '예약 발행', '일시']),

  entry('Button','action','명시적인 사용자 동작을 실행한다.',['저장·취소·삭제 버튼이 필요할 때'],['primary를 여러 개 쓰지 마라','아이콘 전용 버튼의 aria-label을 빼지 마라'],'6',[
    "variant=danger는 되돌릴 수 없는 작업에만 쓴다.",
    "링크를 버튼처럼 표시하려면 asChild 안에 링크 하나를 넣는다."
  ],['variant','size','iconOnly','asChild','leadingIcon','trailingIcon'],['button'],['Input'],['버튼','저장','삭제','액션']),
  entry('Input','form','단일 값·비밀번호·검색어를 입력한다.',['텍스트·금액 한 칸을 입력할 때'],['금액·수량에 type=number를 쓰지 마라','네이티브 검증 메시지에 의존하지 마라','오류를 색만으로 표시하지 마라'],'17',[
    rule("금액·수량: type=text inputMode=numeric, numeric. 예상 자릿수로 폭을 좁혀 우측 숫자와 레이블이 멀어지지 않게 한다.", "17.1"),
    rule("number 휠 증감은 내장 차단하며 페이지 스크롤은 유지한다.", "17.1"),
    rule('검색 칸은 type="search"를 쓴다. 돋보기·지우기가 내장되므로 아이콘을 따로 겹치지 않는다.', '17.1'),
    rule('앞쪽 장식은 leadingIcon, 검색 돋보기를 끄려면 leadingIcon={null}. password 보기는 내장 버튼을 쓴다.', '17.1'),
    rule("날짜는 DatePicker 우선. type=date는 value 문자열로 다룬다.", "17.1"),
    rule("앱 검증·Field 한국어 오류를 쓴다.", "17.1")
  ],['invalid','numeric','leadingIcon','type','inputMode'],['input','input-control','input-leading-icon','input-action'],['Field','FormFlow','Textarea'],['입력','텍스트','금액','입력칸','숫자 입력','통화','가격','비밀번호','검색','검색창','전화번호','수량','금액 입력']),
  entry('Textarea','form','여러 줄 메모와 긴 글을 입력한다.',['메모·비고를 여러 줄로 작성할 때'],["자동 높이가 필요하면 autoGrow를 쓰고 직접 높이를 계산하지 않는다", "autoGrow가 꺼진 입력의 크기 조절을 막지 마라"],'17',[
    rule("autoGrow는 maxHeight(기본 240px)까지 자란 뒤 안에서 스크롤한다.", "17.2"),
    rule("FormFlow 안 Enter·Shift+Enter는 줄바꿈, Ctrl/Cmd+Enter는 제출이다. 줄바꿈을 이동으로 바꾸지 않는다.", "17.2")
  ],['rows','autoGrow','maxHeight','invalid'],['textarea'],['Field','FormFlow','Input'],['여러 줄','메모','비고','긴 글']),
  entry('RadioGroup','form','여러 선택지 중 하나만 선택한다.',['여러 옵션 중 하나만 선택하는 택일 항목을 모두 보여줄 때'],["각 선택지에 연결된 레이블을 생략하지 마라","제출값 없이 보기·필터 단위를 즉시 바꾸면 SegmentedControl, 패널 전환은 Tabs를 쓴다"],'17',[
    rule("묶음 제목: Field label. 항목은 Label htmlFor=RadioGroupItem id로 연결한다. aria-label·aria-labelledby 우선.", "17.3"),
    rule("화살표로 포커스와 선택을 함께 옮긴다.", "17.3"),
    rule("FormFlow 안 Enter는 다음 칸으로 이동한다. 별도 처리 금지.", "11.5")
  ],['value','defaultValue','onValueChange','disabled'],['radio-group'],['RadioGroupItem','Label','SegmentedControl','Tabs'],['라디오','하나만 선택','택일']),
  part('RadioGroupItem','RadioGroup',"라디오 선택지 하나를 표시한다.",['value','disabled'],['radio-group-item','radio-group-indicator']),
  entry('Switch','form','켜기 끄기 설정을 즉시 적용한다.',['알림·자동 재고 차감처럼 저장 버튼 없이 즉시 적용할 때'],['주문 저장 대기 값에 Switch를 쓰지 마라','제출할 때 함께 적용하는 값은 Checkbox를 써라'],'17',[
    rule("Switch의 id에 Label htmlFor를 연결한다.", "17.4"),
    rule("FormFlow 안 Enter는 이동, Space는 토글이다. 앱이 Enter 토글을 붙이지 않는다.", "11.5")
  ],['checked','defaultChecked','onCheckedChange','disabled'],['switch','switch-thumb'],['Label','Checkbox'],['스위치','토글','켜기 끄기','즉시 적용']),
  entry('Label','form','컨트롤 옆의 레이블로 입력 이름을 연결한다.',['Field를 쓰지 않는 Switch·Checkbox·Radio 옆에 입력 이름이 필요할 때'],['Field를 Label로 재구현하지 마라'],'17',[
    rule("htmlFor에 컨트롤 id를 준다.", "17.5"),
    rule("필수 표시와 별개로 컨트롤에도 required를 준다.", "17.5")
  ],['htmlFor','required'],['label','label-required'],['Field','Switch','Checkbox','RadioGroup'],['레이블','입력 이름']),
  entry('StatusChip','status','레코드의 상태를 라벨과 실루엣으로 표시한다.',['완료·경고·오류 상태를 표시할 때'],['같은 원형 점의 색만 바꾸지 마라'],'2.3','아이콘 모양과 텍스트로 상태를 구분한다.',['tone','icon','hideIcon'],['status-chip'],['DataTable'],['상태','완료','경고','칩','주문 상태','배송 상태','상태 표시']),
  ...[
    ['Card',"관련 정보를 평면 카드로 묶는다.",'card',null],['CardHeader',"카드 제목과 보조 동작을 배치한다.",'card-header','Card'],
    ['CardTitle',"카드 제목을 표시한다.",'card-title','Card'],['CardBody',"카드 본문을 담는다.",'card-body','Card'],['CardFooter',"카드 하단의 보조 정보를 담는다.",'card-footer','Card'],
  ].map(([name,purpose,slot,partOf]) => partOf ? part(name, partOf, purpose, ['className'], [slot]) : entry(name,'layout',purpose,['관련 정보를 카드로 묶을 때'],['평면 카드에 그림자를 넣지 마라'],'5',['경계선과 여백으로 구조를 만든다.', rule('헤더 없이 CardBody만 써도 된다. 카드 첫 본문의 위 여백은 내장되어 있다.', '6')],['className'],[slot],name === 'Card' ? ['CardHeader','CardBody','CardFooter'] : ['Card'],['카드',name])),
  entry('Checkbox','form',"선택·해제·일부 선택 상태를 표시한다.",['행 선택이나 복수 선택이 필요할 때'],['레이블 없이 쓰지 마라','저장 버튼 없이 즉시 적용하는 설정은 Switch를 써라'],'17',[
    "폼 제출 때 함께 적용하는 동의·목록 선택에 쓴다."
  ],['indeterminate','checked'],['checkbox'],['DataTable'],['체크','선택','혼합']),
  entry('DataTable','table','정렬·선택·가상화가 가능한 데이터 표다.',['많은 레코드를 열로 비교할 때'],['금액을 가변폭 숫자로 쓰지 마라','긴 글 열을 ClampText 로 감싸지 마라'],'4',[
    "열은 @s2life/ui의 createDataTableColumnHelper<T>()로 h.columns([h.accessor(...)])를 만든다.",
    "열 정의를 위해 TanStack을 직접 설치하지 않는다.",
    "셀은 말줄임·전체 값 title을 제공한다. 별도 말줄임으로 감싸지 않는다.",
    "필터 등으로 data에서 빠진 행은 선택이 자동 해제된다. 앱은 selectedIds를 그대로 일괄 작업에 쓴다. 로딩·오류 중에는 선택을 유지한다.",
    rule('페이지를 넘기면 선택이 해제된다. 서버 페이징은 표 아래에 Pagination을 조립한다.', '4.1'),
    "화면 라벨이 원본 값과 다른 열(상태 등)은 exportValue로 CSV 값을 지정한다."
  ],['data','columns','getRowId','selectionMode','density','state','virtualize','revisitedRowId'],['data-table','data-table-row'],['Peek','Checkbox','StatusChip','Pagination'],['표','테이블','행','정렬','목록','레코드','여러 건 선택','다중 선택','일괄 선택','주문 목록']),
  entry('SELECTION_COLUMN_ID','constant','DataTable 선택 열의 식별자 상수다.',['선택 열 고정을 지정할 때'],['React 컴포넌트로 렌더링하지 마라'],'6',[],[],[],['DataTable'],['선택 열 식별자']),
  entry('ChartFrame','chart',"차트의 제목·범례와 로딩·빈 상태·오류를 함께 표시한다.",['차트 공통 외곽과 상태가 필요할 때'],['빈 데이터와 실패를 합치지 마라'],'7.5.6',[
    "state로 loading·empty·error를 구분해 준다."
  ],['summary','title','legend','state','children'],['chart-frame'],['TrendBand','BulletRow','CompositionArea'],['차트 프레임','범례']),
  entry('StatTile','chart','대시보드의 단일 지표 값과 비교 기간의 증감을 보여준다.',['대시보드 위에 주문·매출·반품률 요약 수치를 놓을 때'],['목표 달성 비교는 BulletRow, 시간 추세는 TrendBand를 쓴다','긴 문자열은 compactValue로 짧은 한국어 표기를 제공한다'],'7.5.7',[
    'value는 문자열 또는 숫자다. 숫자는 ko-KR·만 이상 만/억/조·소수 첫째 자리로 축약하고 원문을 보존한다. format으로 숫자 서식을 정한다.',
    'delta는 부호 있는 수다. 기본 percent에서 12는 12%, absolute는 deltaUnit을 쓴다. deltaLabel에 전일 대비 등 기준을 준다.',
    'goodDirection 기본 up, 반품률은 down, 판단 없는 증감은 none이다. 방향 아이콘·부호·success/danger 색을 함께 쓰고 0은 중립이다.',
    '값은 title 24px·고정폭 숫자다. 접근성 이름은 라벨·원문·증감 방향과 크기·비교 기준을 한 문장으로 읽는다.',
    '그리드는 repeat(auto-fit, minmax(min(100%, 200px), 1fr))·gap 16px로 배치한다. 별도 그리드 부품은 없다.',
    'state=loading은 스켈레톤, error는 ErrorState·onRetry다. 실패를 0으로 표시하지 않는다. 짧은 대기는 useDelayedLoading으로 지연한다.',
    'href 또는 asChild의 단일 자식 링크로 상세 이동을 연결한다. 로딩·오류에서는 이동을 제공하지 않는다.'
  ],['label','value','format','unit','compactValue','delta','deltaFormat','deltaUnit','deltaLabel','goodDirection','state','errorMessage','onRetry','href','asChild'],['stat-tile','stat-tile-label','stat-tile-value','stat-tile-delta','stat-tile-change','stat-tile-comparison','stat-tile-loading'],['Card','BulletRow','TrendBand','ErrorState'],['KPI','지표','대시보드 숫자','요약 수치','증감','전일 대비']),
  entry('TrendBand','chart','시간 추세와 상하 범위를 보여준다.',['시계열 추세와 밴드를 비교할 때'],['텍스트 요약을 빼지 마라','단일 값과 증감만 필요하면 StatTile을 쓴다'],'7.5.3',[
    "summary는 추세 결론의 접근성 이름이다. 화면에도 필요하면 별도 문장으로 표시한다."
  ],['data','x','y','yLow','yHigh','summary'],['trend-band'],['ChartFrame','StatTile'],['추세','추이','시계열','밴드','선 그래프','변동 범위','상하한','편차']),
  entry('BulletRow','chart','목표 대비 실적을 행으로 비교한다.',['KPI 목표 달성도를 비교할 때'],['달성 여부를 색만으로 표현하지 마라','단일 KPI 값·전일 대비 증감은 StatTile을 쓴다'],'7.5.3',[
    rule("summary는 실적 결론의 접근성 이름이다. 화면에도 필요하면 별도 문장으로 표시한다.", "7.5.3"),
    rule("skeletonRows를 실제 지표 수와 맞춰 로딩 전후 높이를 유지한다.", "7.5.6")
  ],['metrics','summary','skeletonRows'],['bullet-row'],['ChartFrame','StatTile'],['실적','목표','KPI 목표','불릿','달성률','목표 대비','실적 비교']),
  entry('CompositionArea','chart','시간별 구성비를 누적 면적으로 보여준다.',['구성 비중 변화를 비교할 때'],['텍스트 라벨을 생략하지 마라'],'7.5.3',[
    "summary는 구성비 결론의 접근성 이름이다. 화면에도 필요하면 별도 문장으로 표시한다.",
    "계열 색은 --status-{neutral,info,warning,success,danger}-fg를 쓴다. 목록 밖 이름은 그려지지 않고 검게 보인다."
  ],['data','x','series','summary'],['composition-area'],['ChartFrame'],['구성비','구성 비율','비중','누적','면적','점유율','비율 변화','시간별 구성']),
  entry('EmptyState','state','표시할 데이터가 없음을 알리고 선택적 액션을 제공한다.',['필터 결과가 비었을 때'],['실패를 빈 상태로 표시하지 마라'],'7.5.6',[
    "title에 빈 이유를 쓰고 action에 다음 행동을 제공한다."
  ],['title','description','graphic','action'],['empty-state'],['ErrorState','DataTable'],['빈 상태','데이터 없음','필터 초기화']),
  entry('ErrorState','state','불러오기 실패와 재시도 경로를 제공한다.',['데이터 요청이 실패했을 때'],['빈 상태와 합치지 마라'],'7.5.6',[
    "다시 요청할 수 있는 오류에는 onRetry를 연결한다."
  ],['title','description','graphic','onRetry'],['error-state'],['EmptyState'],['불러오기 실패','재시도','데이터 오류']),
  entry('Avatar','media','사진이나 이니셜로 사람을 식별한다.',['사용자 이름과 사진을 표시할 때'],['상태색 팔레트로 사람을 구분하지 마라'],'2.4',[
    rule("name에는 이니셜 대신 보조기기가 읽을 전체 이름을 준다.", "14.4")
  ],['name','src','size','decorative'],['avatar'],['Thumbnail'],['아바타','이니셜','사용자 사진']),
  entry('Thumbnail','media','이미지 공간을 예약하고 실패를 대체한다.',['상품·미디어 이미지를 표시할 때'],['빈 src로 이미지 요청을 보내지 마라'],'9.2',[
    "ratio를 실제 이미지 비율과 맞춰 자리를 예약한다."
  ],['src','alt','ratio'],['thumbnail'],['Skeleton','Avatar'],['썸네일','상품 사진','이미지 실패']),
  entry('Skeleton','loading','알려진 콘텐츠 형태의 자리 표시자다.',['콘텐츠 모양을 미리 알 때'],['형태를 모르면 쓰지 마라'],'9.2','실제 콘텐츠와 같은 치수를 쓴다.',['variant','width','height','animation','textStyle'],['skeleton'],['SkeletonText','ProgressTrack'],['스켈레톤','자리 표시','로딩','불러오는','불러오기','데이터 대기','콘텐츠 대기','로딩 중']),
  entry('SkeletonText','loading','문단 형태의 로딩 자리 표시자다.',['여러 줄 텍스트를 기다릴 때'],["문단 모양을 바꿀 때 마지막 줄까지 같은 길이로 채우지 마라"],'9.2',[
    "textStyle은 실제 본문에 맞춘다."
  ],['lines','textStyle','lastLineWidth'],['skeleton-text'],['Skeleton'],['문단 로딩','텍스트 스켈레톤']),
  ...[
    ['CardSkeleton','카드','card-skeleton',['label'],'조절값이 없다. 완료 후 모양이 카드 한 장이 아니면 Skeleton으로 직접 구성한다.'],
    ['ListSkeleton','목록','list-skeleton',['rows','label'],'rows를 첫 화면에 실제로 보일 행 수와 맞춘다.'],
    ['FormSkeleton','폼','form-skeleton',['fields','label'],'fields를 실제 입력 칸 수와 맞춘다.'],
    ['ChartSkeleton','차트','chart-skeleton',['height','legend','variant','rows'],'height·variant·legend를 완료 후 차트와 맞춘다.'],
  ].map(([name,label,slot,props,presetRule]) => entry(name,'loading',`${label} 형태의 로딩 자리 표시자다.`,[`${label}의 콘텐츠 배치와 치수를 알 때`],['실제 콘텐츠와 다른 치수로 쓰지 마라'],'9.2',presetRule,props,[slot],['Skeleton'],[label,`${label} 로딩`,`${label} 스켈레톤`,`${label} 불러오는 중`,`${label} 불러오기`])),
  entry('ProgressTrack','loading','진행률과 예상 시간을 표시한다.',['긴 작업의 진행 정도를 알릴 때'],['모르는 진행률을 지어내지 마라'],'9.1',['value와 etaSeconds로 진행률과 남은 시간을 함께 알린다.'],['value','label','etaSeconds'],['progress-track'],['TaskProgress'],['진행률','진행 표시','대기','남은 시간','예상 시간','진행 바']),
  entry('TaskProgress','loading','드문 장기 작업의 단계와 진행을 표시한다.',['대량 내보내기·일괄 작업을 기다릴 때'],['자주 짧게 기다리는 곳에 장식 모션을 쓰지 마라','여러 단계 폼의 위치는 Steps를 쓴다'],'9.3',[],['title','value','steps','etaSeconds','onDismiss'],['task-progress'],['ProgressTrack','Steps'],['대량','일괄','장기 작업','내보내기','오래 걸리는','진행 상황','진행률','작업 단계','백그라운드 작업']),
  entry('Tooltip','guide','컨트롤의 뜻을 한 줄로 설명한다.',['호버·키보드 포커스로 UI 의미를 확인할 때'],['데이터 요약이나 액션을 넣지 마라','여러 문장을 넣지 마라'],'10.4',[
    "Tooltip 안으로 포커스를 옮기지 않는다. 컨트롤에 그대로 둔다."
  ],['children','content','disabled'],['guide-tooltip'],['Hint','Tour','Peek'],['툴팁','호버','한 줄','컨트롤 설명','UI 설명']),
  entry('Hint','guide','새 기능·놓치기 쉬운 UI를 한 번 알린다.',['새 기능을 2~3줄과 액션으로 알릴 때'],['레코드 요약용으로 쓰지 마라'],'10.2','닫은 안내를 반복하지 않도록 앱이 기억한다.',['children','open','title','body','onDismiss','action'],['guide-hint'],['Tooltip','Tour','Peek'],['힌트','새 기능','한 번','맥락형 안내']),
  entry('Tour','guide','사용자가 요청한 UI 흐름을 단계로 안내한다.',['사용자가 전체 흐름 학습을 요청할 때'],['자동 실행하지 마라','닫기·Escape를 막지 마라'],'10.1','최대 3단계이며 항상 건너뛸 수 있다.',['steps','active','next','previous','skip'],['guide-hint'],['Tooltip','Hint','Peek'],['투어','온보딩','단계','단계별','단계별 안내','사용법','흐름 학습','기능 흐름','처음 온 사용자','둘러보기','시작 안내']),
  entry('Field','form','레이블·설명·오류와 입력 접근성을 연결한다.',['폼 필드의 설명과 검증 오류를 표시할 때'],["Field가 입력값을 관리한다고 가정하지 마라"],'11.4',[
    "값과 검증 결과는 앱이 관리하고 Field에 표시 문구를 준다."
  ],['label','description','error','required','children'],['field','field-error'],['Input','FormFlow'],['필드','오류','레이블','폼 검증','입력값 검증','틀렸을 때','오류 문구','유효성 검사']),
  entry('FormFlow','form','반복 입력 폼의 Enter 이동과 제출 흐름을 제공한다.',['반복 입력에서 마우스 이동을 줄일 때'],['조합 중 Enter로 이동하지 마라','textarea Enter를 가로채지 마라','단계 위치는 Steps를 쓰고 폼을 중첩하지 마라'],'11.5',[
    "Enter는 Tab 순서로 이동한다. 별도 입력 순서를 만들지 않는다.",
    "단일 행 Shift+Enter를 제출로 바꾸지 않는다. 이전 칸 이동이다.",
    "자체 컨트롤의 포커스 요소에 data-form-control=advance로 Enter 이동을 지정한다.",
    "마지막 일반 입력의 Enter 제출은 data-form-control=advance 없이 유지한다.",
    "실제 액션 버튼에는 이동 표식을 붙이지 않는다. Enter 실행을 보존한다.",
    "textarea의 Enter·Shift+Enter는 줄바꿈이다. 다음 칸은 Tab, 제출은 Ctrl/Cmd+Enter를 쓴다.",
    rule("여러 단계 폼은 활성 단계마다 FormFlow 하나를 두고 이동 후 새 제목에 포커스한다.", "11.8")
  ],['onSubmit','restartOnSubmit','onSubmitError'],['form-flow'],['Field','Input','Steps'],['연속 입력','반복 입력','Enter','폼 이동','다음 입력칸','키보드 이동','다음 칸','이전 칸']),
  entry('Peek','overlay',"레코드를 열지 않고 핵심 내용을 요약해 보여준다.",['표의 행을 열지 않고 내용을 확인할 때'],['호버로 열지 마라','수정·삭제는 SheetContent를 쓴다'],'12.1','요약은 최대 6줄. 넘치면 상세 페이지다.',['open','onOpenChange','title','items','action','children'],['peek'],['Tooltip','Hint','Tour','DataTable','SheetContent'],['요약','미리보기','peek','팝오버','행 상세','레코드 내용']),
];

for (const parent of intents) {
  const parts = intents.filter((item) => item.partOf === parent.name).map((item) => item.name);
  if (parts.length) parent.parts = parts;
}
export default intents;
