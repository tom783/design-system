import * as React from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface CarouselProps {
  /** 캐러셀 그룹의 이름. 예: 출고 안내 배너. */
  label: string;
  children: React.ReactNode;
  /** 자동 넘김 간격(ms). 지정하면 정지 버튼도 항상 함께 제공한다. */
  autoplay?: number;
  showArrows?: boolean;
  showDots?: boolean;
  /** 루트 요소의 폭·여백 등 스타일을 확장한다. */
  className?: string;
}

const SlidePosition = React.createContext({ index: 0, total: 1 });

export function CarouselSlide({ className, ...props }: React.ComponentProps<'div'>) {
  const { index, total } = React.useContext(SlidePosition);
  return <div {...props} data-slot="carousel-slide" className={cn('ds-carousel-slide', className)}
    role="group" aria-roledescription="슬라이드" aria-label={`${index + 1}번째, 총 ${total}개`} />;
}

export function Carousel({ label, children, autoplay, showArrows = true, showDots = true, className }: CarouselProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const trackId = React.useId();
  const slides = React.useMemo(() => React.Children.toArray(children), [children]);
  const total = slides.length;
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [userStopped, setUserStopped] = React.useState(false);
  const userStoppedRef = React.useRef(false);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  // 처음 효과가 환경을 확인하기 전에는 자동재생하지 않는다(SSR 포함).
  const [reduced, setReduced] = React.useState(true);
  const [hidden, setHidden] = React.useState(true);
  const automaticScroll = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTimer = React.useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const stopForUser = React.useCallback(() => {
    // ref도 즉시 잠근다. React의 다음 렌더 전 타이머가 만료되어도 재생할 수 없다.
    userStoppedRef.current = true;
    cancelTimer();
    setUserStopped(true);
  }, [cancelTimer]);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { if (media.matches) cancelTimer(); setReduced(media.matches); };
    const visibilityChanged = () => { if (document.hidden) cancelTimer(); setHidden(document.hidden); };
    // 포인터나 autofocus 요소 아래에 마운트되면 enter/focus 이벤트가 이미 지나갔을 수 있다.
    setHovered(rootRef.current?.matches(':hover') ?? false);
    setFocused(rootRef.current?.contains(document.activeElement) ?? false);
    motionChanged(); visibilityChanged();
    media.addEventListener('change', motionChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      media.removeEventListener('change', motionChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [cancelTimer]);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const nodes = Array.from(track.children).filter(node => node.getAttribute('data-slot') === 'carousel-slide');
    // 60% 이상 보이는 실제 슬라이드만 현재값으로 삼는다. 스크롤량으로 번호를 추측하지 않는다.
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        setIndex(nodes.indexOf(entry.target));
      }
    }, { root: track, threshold: 0.6 });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [slides]);

  const atEnd = total <= 1 || index >= total - 1;
  const interval = autoplay !== undefined && Number.isFinite(autoplay) && autoplay > 0 ? autoplay : null;
  const playing = interval !== null && !paused && !userStopped && !hovered && !focused && !reduced && !hidden && !atEnd;
  React.useEffect(() => {
    if (!playing || interval === null) return;
    timer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track || userStoppedRef.current || document.hidden || track.matches(':focus-within')
        || rootRef.current?.matches(':hover') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      automaticScroll.current = true;
      track.scrollBy({ left: track.clientWidth });
    }, interval);
    return cancelTimer;
  }, [playing, interval, index, cancelTimer]);

  const move = (direction: -1 | 1) => {
    stopForUser();
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth });
  };
  // aria-pressed는 명시적 정지 상태다. 호버·포커스는 선택을 바꾸지 않는 일시 유예다.
  const stopped = paused || userStopped || reduced || atEnd || interval === null;
  return <div ref={rootRef} data-slot="carousel" className={cn('ds-carousel', className)} data-index={index}
    data-playing={playing} data-user-stopped={userStopped}
    onMouseEnter={() => { cancelTimer(); setHovered(true); }} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => { cancelTimer(); setFocused(true); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div ref={trackRef} id={trackId} data-slot="carousel-track" className="ds-carousel-track"
      role="group" aria-roledescription="캐러셀" aria-label={label} tabIndex={0}
      aria-live={userStopped ? 'polite' : 'off'} aria-relevant="text" aria-atomic={false}
      onKeyDownCapture={event => {
        if (event.target === event.currentTarget && ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' '].includes(event.key)) stopForUser();
      }}
      onWheelCapture={event => { if (event.deltaX !== 0 || (event.shiftKey && event.deltaY !== 0)) stopForUser(); }}
      onPointerDownCapture={stopForUser}
      onClickCapture={stopForUser}
      onScroll={() => { if (!automaticScroll.current) stopForUser(); }}
      onScrollEnd={() => { automaticScroll.current = false; }}>
      {slides.map((slide, position) => <SlidePosition.Provider key={(React.isValidElement(slide) && slide.key) || position}
        value={{ index: position, total }}>{slide}</SlidePosition.Provider>)}
      <span data-slot="carousel-announcement" className="sr-only">{userStopped ? `${total}개 중 ${index + 1}번째` : ''}</span>
    </div>
    <div data-slot="carousel-controls" className="ds-carousel-controls">
      {showArrows && <button type="button" data-slot="carousel-previous" className="ds-carousel-control"
        aria-label="이전 슬라이드" aria-controls={trackId} disabled={index === 0 || total === 0} onClick={() => move(-1)}>
        <ChevronLeft aria-hidden="true" />
      </button>}
      {showDots && <div data-slot="carousel-dots" className="ds-carousel-dots" role="group" aria-label="슬라이드 선택">
        {slides.map((_, position) => <button key={position} type="button" data-slot="carousel-dot" className="ds-carousel-dot"
          aria-label={`${position + 1}번째 슬라이드로 이동`} aria-controls={trackId} aria-current={position === index ? 'true' : undefined}
          onClick={() => { stopForUser(); const track = trackRef.current; track?.scrollTo({ left: position * track.clientWidth }); }}>
          <span aria-hidden="true" />
        </button>)}
      </div>}
      {showArrows && <button type="button" data-slot="carousel-next" className="ds-carousel-control"
        aria-label="다음 슬라이드" aria-controls={trackId} disabled={atEnd} onClick={() => move(1)}>
        <ChevronRight aria-hidden="true" />
      </button>}
      {autoplay !== undefined && <button type="button" data-slot="carousel-pause" className="ds-carousel-control"
        aria-label={stopped ? '자동 넘김 시작' : '자동 넘김 멈춤'} aria-pressed={stopped}
        disabled={userStopped || reduced || atEnd || interval === null}
        onClick={() => { cancelTimer(); setPaused(value => !value); }}>
        {stopped ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>}
    </div>
    {userStopped && autoplay !== undefined && <p data-slot="carousel-stopped" className="ds-carousel-stopped">직접 조작하여 자동 넘김이 종료되었습니다.</p>}
  </div>;
}
