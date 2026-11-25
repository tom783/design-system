import * as React from 'react';
import { Link } from 'react-router';
import { Button, SectionHeader } from '@s2life/ui';
import { ArrowRight, Terminal } from '@s2life/ui/icons';
import meta from 'virtual:site-meta';
import { componentCount } from '../../data/manifest';
import { homeAiSteps, homeHero, homePrinciples } from '../../content/home';
import { SiteBar, SiteFooter, SkipLink } from '../../layout/SiteBar';
import { OrderSample, componentName } from './OrderSample';
import './home.css';
import './effects.css';

/** 대상이 화면(뷰포트)에 걸쳐 있는지. 상단 바 표면과 번짐 흐름의 재생을 이것으로 켠다. */
function useInView(ref: React.RefObject<Element | null>) {
  const [inView, setInView] = React.useState(true);
  React.useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry!.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/**
 * 표본 뒤의 효과 층(effects.css) — 크림슨 번짐 1개 + 4px 격자 은유의 32px 격자. 장식이라 읽기·탭 순서에서 뺀다.
 * 번짐 흐름은 이 층이 화면에 걸쳐 있을 때만 재생한다(밖이면 멈춤).
 */
function Scenery() {
  const ref = React.useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  return <div ref={ref} className="site-home-scenery" data-visible={visible} aria-hidden="true" inert>
    <div className="site-home-scenery-center">
      <div className="site-home-glow-carrier"><div className="site-home-glow" /></div>
      <div className="site-home-grid" />
    </div>
  </div>;
}

/**
 * 첫 화면 상단 바 — 사이트 공통 상단 바(layout/SiteBar)에 첫 화면 효과만 더한다: 맨 위에선 투명, 내리면 반투명 표면 + 블러(effects.css).
 * 문서 맨 위 1px 표식이 화면 밖이면 stuck.
 */
function HomeBar({ main }: { main: React.RefObject<HTMLElement | null> }) {
  const top = React.useRef<HTMLDivElement>(null);
  const atTop = useInView(top);
  return <>
    <div ref={top} className="site-home-top" aria-hidden="true" />
    <SiteBar main={main} stuck={!atTop} />
  </>;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 첫 화면 — 시안 r4(B 격자와 번짐 + 상단 바 블러 + 순차 조립).
 * 조립: AI 흐름 세 줄과 표본이 같은 순서로 한 번 나타난다(필터 → 행 → 상태 칩, 960ms). 마지막 단계가 끝나면 조립 규칙을 떼어
 * 검색·필터로 새로 그려지는 행은 다시 움직이지 않는다. 움직임 줄이기면 처음부터 끝 상태다.
 */
export function HomePage() {
  const [assembly, setAssembly] = React.useState<'playing' | 'done'>(() => reducedMotion() ? 'done' : 'playing');
  const page = React.useRef<HTMLDivElement>(null);
  const main = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const root = page.current;
    if (assembly === 'done' || !root) return;
    // 마지막 단계가 끝나거나(end) 도중에 사라지면(cancel — 예: 움직임 줄이기를 켬) 조립 규칙을 뗀다. 다시 재생하지 않는다.
    // React 는 animationcancel 을 이벤트 prop 으로 주지 않아 직접 듣는다.
    const settle = (event: AnimationEvent) => {
      if (event.target === root && (event.type === 'animationcancel' || event.animationName === 'site-assemble-3')) setAssembly('done');
    };
    root.addEventListener('animationend', settle);
    root.addEventListener('animationcancel', settle);
    // 배경 탭 등으로 이벤트가 오지 않아도 조립 규칙은 뗀다(끝 상태는 규칙이 없을 때와 같다).
    const fallback = window.setTimeout(() => setAssembly('done'), 2000);
    return () => {
      root.removeEventListener('animationend', settle);
      root.removeEventListener('animationcancel', settle);
      window.clearTimeout(fallback);
    };
  }, [assembly]);

  return <div ref={page} className="site-home-page" data-assembly={assembly}>
    {/* 다른 페이지와 같은 건너뛰기 — 상단 바의 메뉴 7개·검색·테마를 지나 본문으로 */}
    <SkipLink main={main} />
    <HomeBar main={main} />
    <main ref={main} id="site-main" tabIndex={-1} className="site-home">
      <section className="site-home-opening" aria-labelledby="home-title">
        <div className="site-home-copy">
          <p className="site-home-version tabular">
            부품 {componentCount} · v{meta.version} · {meta.published ? `npm ${meta.published.version}` : 'npm 게시판 없음'}
          </p>
          <h1 id="home-title" className="site-home-title">{homeHero.title}</h1>
          <p className="site-home-lead">{homeHero.lead}</p>
          <div className="site-home-cta">
            <Button asChild variant="primary" trailingIcon={<ArrowRight aria-hidden="true" />}>
              <Link to="/start#install">{homeHero.install}</Link>
            </Button>
            <Button asChild leadingIcon={<Terminal aria-hidden="true" />}>
              <Link to="/ai#connect">{homeHero.connect}</Link>
            </Button>
          </div>
        </div>
        <div id="order-demo" className="site-home-demo">
          <Scenery />
          <OrderSample />
        </div>
      </section>

      <SectionHeader className="site-home-steps" title={homeAiSteps.title}>
        <dl className="site-home-step-list">
          <div className="site-home-step" data-home-step="1">
            <dt>{homeAiSteps.request.label}</dt>
            <dd>{homeAiSteps.request.value}</dd>
          </div>
          <div className="site-home-step" data-home-step="2">
            <dt>{homeAiSteps.parts.label}</dt>
            <dd>{homeAiSteps.parts.value.map(componentName).join(' · ')}</dd>
          </div>
          <div className="site-home-step" data-home-step="3">
            <dt>{homeAiSteps.result.label}</dt>
            <dd><a className="site-link" href="#order-demo">{homeAiSteps.result.value}</a></dd>
          </div>
        </dl>
      </SectionHeader>

      <SectionHeader className="site-home-principles" title={homePrinciples.title}>
        <dl className="site-home-principle-list">
          {homePrinciples.items.map((item) => <div key={item.id} className="site-home-principle">
            <dt>{item.name}</dt>
            <dd>{item.summary}</dd>
          </div>)}
        </dl>
      </SectionHeader>
    </main>
    <SiteFooter />
  </div>;
}
