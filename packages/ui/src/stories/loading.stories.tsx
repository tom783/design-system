import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../components/button';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../components/card';
import { Input } from '../components/input';
import { TrendBand } from '../components/chart';
import { Skeleton, SkeletonText, CardSkeleton, ListSkeleton, FormSkeleton, ChartSkeleton, ProgressTrack, TaskProgress, type SkeletonTextStyle } from '../components/loading';
import { useDelayedLoading } from '../lib/use-delayed-loading';
import tokens from '../../../../docs/research/tokens.json';

const tokenDelay = Number.parseFloat(tokens.loading['loading-delay']);
const tokenMinimum = Number.parseFloat(tokens.loading['loading-min-visible']);
const tokenLongTask = Number.parseFloat(tokens.loading['loading-long-task']);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const meta = {
  title: 'Components/Loading',
  parameters: { docs: { description: { component: 'DESIGN.md 9절: 200ms 전에는 아무 표시 없이, 200~400ms에는 컨트롤 상태만, 400ms부터 알려진 형태의 스켈레톤, 3초부터 진행률, 10초부터 떠날 수 있는 경로를 제공합니다.' } } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function WaitingDemo() {
  const [request, setRequest] = React.useState<{ duration: number; startedAt: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const pending = useDelayedLoading(busy);
  // 훅의 200ms 기본 지연과 화면의 스켈레톤 표시 구간(400ms)은 별개 정책이다.
  const skeleton = useDelayedLoading(busy, { delay: tokenDelay * 2 });
  const progress = useDelayedLoading(busy, { delay: 3000 });
  const longTask = useDelayedLoading(busy, { delay: tokenLongTask });
  const [background, setBackground] = React.useState(false);
  const active = busy || pending || skeleton || progress || longTask;
  React.useEffect(() => {
    if (!request) return;
    const end = setTimeout(() => { setBusy(false); setElapsed(request.duration); }, request.duration);
    const clock = setInterval(() => setElapsed(Math.min(request.duration, performance.now() - request.startedAt)), 100);
    return () => { clearTimeout(end); clearInterval(clock); };
  }, [request]);
  const start = (duration: number) => {
    setElapsed(0); setBackground(false); setBusy(true); setRequest({ duration, startedAt: performance.now() });
  };
  return <section data-testid="waiting-demo" data-active={active} className="flex flex-col gap-4">
    <p>150ms는 표시 없음 · 300ms는 버튼 상태만 · 1.5초는 스켈레톤 · 5초는 스켈레톤과 진행률</p>
    <div className="flex flex-wrap gap-2">{[[150, '150ms'], [300, '300ms'], [1500, '1.5s'], [5000, '5s']].map(([ms, label]) =>
      <Button key={ms} onClick={() => start(Number(ms))} disabled={active} aria-busy={pending || undefined}>{label}{pending && request?.duration === ms ? ' · 처리 중' : ''}</Button>)}</div>
    <div className="min-h-64">
      {longTask && !background ? <TaskProgress title="주문 내보내기" value={request ? elapsed / request.duration : undefined}
        onDismiss={() => setBackground(true)} /> : <>
        {skeleton ? <CardSkeleton label="주문 요약을 불러오는 중" /> : <RealCard />}
        {progress && <ProgressTrack label="주문 1,284건 내보내는 중" value={request ? elapsed / request.duration : undefined} etaSeconds={request ? (request.duration - elapsed) / 1000 : undefined} className="mt-4" />}
      </>}
    </div>
    <output data-testid="waiting-result">{request && !active ? `${request.duration}ms 요청 완료` : '주문 요약'}</output>
  </section>;
}

/** 순간 표시도 놓치지 않도록 렌더 사이의 DOM 변화를 누적한다. */
function watchLoaders(root: HTMLElement) {
  const seen = new Set<string>();
  const record = () => {
    for (const selector of ['[data-slot="skeleton"]', '[role="progressbar"]', 'button[aria-busy="true"]']) {
      if (root.querySelector(selector)) seen.add(selector);
    }
  };
  const observer = new MutationObserver(record);
  observer.observe(root, { childList: true, subtree: true, attributes: true });
  record();
  return { seen, stop: () => observer.disconnect() };
}

export const 대기시간_계층: Story = {
  render: () => <WaitingDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const [duration, label] of [[150, '150ms'], [300, '300ms'], [1500, '1.5s'], [5000, '5s']] as const) {
      const watcher = watchLoaders(canvasElement);
      try {
        await userEvent.click(canvas.getByRole('button', { name: label }));
        await waitFor(() => expect(canvas.getByTestId('waiting-result')).toHaveTextContent(`${duration}ms 요청 완료`), { timeout: duration + 2000 });
        await expect(watcher.seen.has('button[aria-busy="true"]')).toBe(duration >= 300);
        await expect(watcher.seen.has('[data-slot="skeleton"]')).toBe(duration >= 1500);
        await expect(watcher.seen.has('[role="progressbar"]')).toBe(duration >= 5000);
      } finally { watcher.stop(); }
    }
    canvasElement.dataset.playComplete = 'true';
  },
};

function FlickerDemo() {
  const [busy, setBusy] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [mounted, setMounted] = React.useState(true);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const delayed = useDelayedLoading(busy);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const run = (duration: number, repeats: number) => {
    timers.current.forEach(clearTimeout); timers.current = []; setRunning(true);
    for (let i = 0; i < repeats; i++) {
      const start = () => {
        setBusy(true);
        timers.current.push(setTimeout(() => { setBusy(false); if (i === repeats - 1) setRunning(false); }, duration));
      };
      if (i === 0) start(); else timers.current.push(setTimeout(start, i * 250));
    }
  };
  return <section className="flex flex-col gap-4" data-testid="flicker-demo" data-running={running}>
    <p>100ms 응답 5회를 반복합니다. 오른쪽은 지연 200ms 안에 끝나므로 로더를 띄우지 않습니다.</p>
    <div className="flex flex-wrap gap-2">
      <Button disabled={running} onClick={() => run(100, 5)}>빠른 응답 5회 반복</Button>
      <Button disabled={running} onClick={() => run(300, 1)}>최소 유지 확인</Button>
      <Button onClick={() => setMounted((value) => !value)}>{mounted ? '검증용 로더 해제' : '검증용 로더 마운트'}</Button>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div><h3>지연 없음</h3><div className="min-h-24" data-testid="raw-loader">{busy && <ListSkeleton rows={2} />}</div></div>
      <div><h3>지연 + 최소 유지</h3><div className="min-h-24" data-testid="delayed-loader">{delayed && <ListSkeleton rows={2} />}</div></div>
    </div>
    {mounted && <MountProbe />}
  </section>;
}
function MountProbe() {
  const [busy, setBusy] = React.useState(false);
  const visible = useDelayedLoading(busy);
  return <div data-testid="mount-probe"><Button onClick={() => setBusy((value) => !value)}>검증용 로딩 전환</Button>{visible && <SkeletonText />}</div>;
}

export const 깜빡임_방지: Story = {
  render: () => <FlickerDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const raw = canvas.getByTestId('raw-loader');
    const delayed = canvas.getByTestId('delayed-loader');
    const rawWatch = watchLoaders(raw);
    const delayedWatch = watchLoaders(delayed);
    try {
      await userEvent.click(canvas.getByRole('button', { name: '빠른 응답 5회 반복' }));
      await waitFor(() => expect(canvas.getByTestId('flicker-demo')).toHaveAttribute('data-running', 'false'), { timeout: 2000 });
      await expect(rawWatch.seen.has('[data-slot="skeleton"]')).toBe(true);
      await expect(delayedWatch.seen.size).toBe(0);
    } finally { rawWatch.stop(); delayedWatch.stop(); }
    // 실제 훅의 표시 유지 시간을 DOM 관측으로 확인한다.
    let shownAt: number | undefined;
    let hiddenAt: number | undefined;
    const observer = new MutationObserver(() => {
      if (delayed.querySelector('[role="status"]')) shownAt ??= performance.now();
      else if (shownAt !== undefined) hiddenAt = performance.now();
    });
    observer.observe(delayed, { subtree: true, childList: true });
    try {
      await userEvent.click(canvas.getByRole('button', { name: '최소 유지 확인' }));
      await waitFor(() => expect(delayed.querySelector('[role="status"]')).not.toBeNull());
      await waitFor(() => expect(raw.querySelector('[role="status"]')).toBeNull());
      await expect(delayed.querySelector('[role="status"]')).not.toBeNull();
      await waitFor(() => expect(hiddenAt).toBeDefined());
      // DOM 관측·브라우저 타이머의 프레임 오차만 허용하며 경계값은 순수 함수 테스트로 검증한다.
      await expect(hiddenAt! - shownAt!).toBeGreaterThanOrEqual(tokenMinimum - 10);
    } finally { observer.disconnect(); }
    // waiting 타이머가 남은 채 해제·재마운트해도 이전 표시가 새 인스턴스로 새지 않는다.
    await userEvent.click(canvas.getByRole('button', { name: '검증용 로딩 전환' }));
    await userEvent.click(canvas.getByRole('button', { name: '검증용 로더 해제' }));
    await sleep(tokenDelay + tokenMinimum);
    await userEvent.click(canvas.getByRole('button', { name: '검증용 로더 마운트' }));
    await expect(canvas.getByTestId('mount-probe').querySelector('[data-slot="skeleton"]')).toBeNull();
    canvasElement.dataset.playComplete = 'true';
  },
};

export const 스켈레톤_기본: Story = {
  render: () => <div className="flex flex-col gap-6">
    <section><h3>형태 · 기본 맥박</h3><div className="flex items-center gap-4">
      <Skeleton variant="text" width="30%" /><Skeleton variant="block" width="30%" height="var(--control-h-md)" /><Skeleton variant="circle" width="var(--space-48)" height="var(--space-48)" />
    </div></section>
    {(['caption', 'body-sm', 'body', 'title'] as SkeletonTextStyle[]).map((style) => <section key={style}>
      <h3>{style}</h3><SkeletonText textStyle={style} />
    </section>)}
    <section><h3>옵트인 shimmer · 정지</h3><div className="flex gap-4"><Skeleton animation="shimmer" height="var(--control-h-md)" width="50%" /><Skeleton animation="none" height="var(--control-h-md)" width="50%" /></div></section>
  </div>,
  play: async ({ canvasElement }) => {
    const rootStyle = getComputedStyle(canvasElement);
    for (const [index, style] of (['caption', 'body-sm', 'body', 'title'] as const).entries()) {
      const block = canvasElement.querySelectorAll('[data-slot="skeleton-text"]')[index]!;
      const line = block.querySelector('[data-slot="skeleton-text-line"]')!;
      const skeleton = line.querySelector('[data-slot="skeleton"]')!;
      await expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      await expect(skeleton.getBoundingClientRect().height).toBeCloseTo(Number.parseFloat(rootStyle.getPropertyValue(`--text-${style}`)) * .65, 1);
      await expect(line.getBoundingClientRect().height).toBe(Number.parseFloat(rootStyle.getPropertyValue(`--text-${style}-lh`)));
      // toHaveStyle({width:'60%'}) 는 쓸 수 없다 — getComputedStyle 이 퍼센트를 px 로
      // 해소해 항상 불일치한다. 실제 렌더 비율로 확인한다.
      const lastLine = block.lastElementChild!.firstElementChild as HTMLElement;
      await expect(lastLine.getBoundingClientRect().width / block.getBoundingClientRect().width)
        .toBeCloseTo(0.6, 2);
    }
    canvasElement.dataset.playComplete = 'true';
  },
};

export const 스켈레톤_패턴: Story = {
  render: () => <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, var(--card-min-w)), 1fr))' }}>
    <section><h3>카드</h3><CardSkeleton /></section>
    <section><h3>목록 · 5행</h3><ListSkeleton rows={5} label="상품 목록을 불러오는 중" /></section>
    <section><h3>폼 · 3필드</h3><FormSkeleton fields={3} /></section>
    <section><h3>차트</h3><ChartSkeleton /></section>
  </div>,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('status')).toHaveLength(4);
    for (const status of within(canvasElement).getAllByRole('status')) {
      await expect(status).toHaveAttribute('aria-busy', 'true');
      await expect(status.querySelector('.sr-only')).not.toBeNull();
    }
    await expect(canvasElement.querySelectorAll('[data-slot="list-skeleton-row"]')).toHaveLength(5);
    await expect(canvasElement.querySelectorAll('[data-slot="form-skeleton-field"]')).toHaveLength(3);
    canvasElement.dataset.playComplete = 'true';
  },
};

function RealCard() {
  return <Card><CardHeader><CardTitle>주문 요약</CardTitle></CardHeader><CardBody>
    <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)]">오늘 접수한 주문을 확인합니다.<br />출고할 상품과 수량을 검토합니다.</p>
  </CardBody><CardFooter>오늘 갱신</CardFooter></Card>;
}
function RealList() {
  return <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-line-strong bg-surface">{['주문 1,284건', '상품 340종', '출고 대기 28건'].map((text) =>
    <li key={text} className="flex h-[var(--row-h-default)] items-center border-line px-[var(--cell-px)] text-[length:var(--text-body-sm)] not-first:border-t">{text}</li>)}</ul>;
}
function RealForm() {
  return <div className="grid gap-[var(--space-16)]">{['상품명', '수취인', '배송지'].map((label) => <label key={label} className="grid gap-[var(--space-4)]">
    <span className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)]">{label}</span><Input defaultValue={`${label} 예시`} />
  </label>)}</div>;
}
const daily = [100, 120, 105, 140].map((value, index) => ({ date: new Date(2026, 10, 11 + index), value }));
function DimensionComparison() {
  const [overlay, setOverlay] = React.useState(false);
  const pairs = [
    { label: '카드', real: <RealCard />, skeleton: <CardSkeleton /> },
    { label: '목록', real: <RealList />, skeleton: <ListSkeleton rows={3} /> },
    { label: '폼', real: <RealForm />, skeleton: <FormSkeleton fields={3} /> },
    { label: '차트', real: <TrendBand data={daily} x={(d) => d.date} y={(d) => d.value} summary="최근 4일 주문이 100건에서 140건으로 증가했습니다." />, skeleton: <ChartSkeleton /> },
  ];
  return <div className="flex flex-col gap-4">
    <p>같은 폭의 실제 콘텐츠와 스켈레톤을 위아래로 비교합니다. 겹쳐 보기를 켜면 윤곽과 높이 차이가 드러납니다.</p>
    <Button onClick={() => setOverlay((value) => !value)} aria-pressed={overlay}>겹쳐 보기</Button>
    <div className="grid gap-6 md:grid-cols-2">{pairs.map(({ label, real, skeleton }) => <section data-testid="dimension-pair" key={label}>
      <h3>{label}</h3><div className="relative">
        <div data-testid="dimension-real">{real}</div>
        <div data-testid="dimension-skeleton" className={overlay ? 'pointer-events-none absolute inset-x-0 top-0 opacity-50' : 'mt-4'}>{skeleton}</div>
      </div>
    </section>)}</div>
  </div>;
}

export const 스켈레톤_치수일치: Story = {
  render: () => <DimensionComparison />,
  play: async ({ canvasElement }) => {
    for (const pair of within(canvasElement).getAllByTestId('dimension-pair')) {
      const real = within(pair).getByTestId('dimension-real');
      const skeleton = within(pair).getByTestId('dimension-skeleton');
      await waitFor(() => expect(Math.abs(real.getBoundingClientRect().height - skeleton.getBoundingClientRect().height)).toBeLessThan(1));
      await expect(real.getBoundingClientRect().width).toBe(skeleton.getBoundingClientRect().width);
    }
    await userEvent.click(within(canvasElement).getByRole('button', { name: '겹쳐 보기' }));
    for (const pair of within(canvasElement).getAllByTestId('dimension-pair')) {
      const real = within(pair).getByTestId('dimension-real');
      const skeleton = within(pair).getByTestId('dimension-skeleton');
      await expect(real.getBoundingClientRect().top).toBe(skeleton.getBoundingClientRect().top);
    }
    canvasElement.dataset.playComplete = 'true';
  },
};

export const 진행률: Story = {
  render: () => <div className="flex flex-col gap-6">
    <ProgressTrack value={.42} label="주문 1,284건 내보내는 중" />
    <ProgressTrack label="주문 수를 확인하는 중" />
    <ProgressTrack value={.72} label="리포트를 생성하는 중" etaSeconds={26} />
    <ProgressTrack value={.95} label="파일을 준비하는 중" etaSeconds={7} />
  </div>,
  play: async ({ canvasElement }) => {
    const bars = within(canvasElement).getAllByRole('progressbar');
    await expect(bars[0]).toHaveAttribute('aria-valuenow', '42');
    await expect(bars[1]).not.toHaveAttribute('aria-valuenow');
    for (const bar of bars) {
      await expect(bar).toHaveAttribute('aria-valuemin', '0');
      await expect(bar).toHaveAttribute('aria-valuemax', '100');
      await expect(bar).toHaveAccessibleName();
      await expect(bar.getBoundingClientRect().height).toBe(6);
    }
    await expect(within(canvasElement).getByText('약 30초 남음')).toBeVisible();
    await expect(within(canvasElement).getByText('곧 완료')).toBeVisible();
    canvasElement.dataset.playComplete = 'true';
  },
};

function LongTaskDemo() {
  const [step, setStep] = React.useState(1);
  const [background, setBackground] = React.useState(false);
  const steps = ['주문 검증', '출고 지시서 생성', '창고에 전달'];
  return <div className="flex flex-col gap-4">
    <p>10초 이상 걸리는 드문 작업의 예입니다. 단계 버튼으로 실제 진행률을 갱신합니다. 문서 이동은 일괄 처리를 나타내며, 단계와 진행률이 현재 상태를 전달합니다.</p>
    <div className="flex flex-wrap gap-2"><Button onClick={() => setStep((value) => Math.min(3, value + 1))} disabled={step === 3}>다음 단계 완료</Button>
      <Button onClick={() => { setStep(1); setBackground(false); }}>다시 시작</Button></div>
    {!background ? <TaskProgress title="출고 일괄 처리" value={step / 3} steps={steps.map((label, index) => ({ label, done: index < step }))}
      etaSeconds={step === 3 ? undefined : (3 - step) * 20} onDismiss={() => setBackground(true)} />
      : <p role="status">백그라운드에서 출고 처리를 계속합니다. 이 예시는 화면 전환 콜백만 실행합니다.</p>}
  </div>;
}
export const 긴작업: Story = {
  render: () => <LongTaskDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector('[aria-current="step"]')).toHaveTextContent('출고 지시서 생성');
    await userEvent.click(canvas.getByRole('button', { name: '다음 단계 완료' }));
    await expect(canvasElement.querySelector('[aria-current="step"]')).toHaveTextContent('창고에 전달');
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    await userEvent.click(canvas.getByRole('button', { name: '다음 단계 완료' }));
    await expect(canvasElement.querySelector('[aria-current="step"]')).toBeNull();
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await userEvent.click(canvas.getByRole('button', { name: '다시 시작' }));
    await userEvent.click(canvas.getByRole('button', { name: '백그라운드로 보내기' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('백그라운드에서 출고 처리를 계속합니다');
    canvasElement.dataset.playComplete = 'true';
  },
};

function ReducedMotionDemo() {
  const [value, setValue] = React.useState(.3);
  return <div className="flex flex-col gap-4">
    <p>Chrome DevTools → Rendering → Emulate CSS media feature prefers-reduced-motion → reduce를 선택하세요. 맥박·shimmer·불확정 흐름·문서 이동이 모두 정지합니다. ‘진행률 갱신’을 누르면 숫자와 단계는 계속 바뀝니다.</p>
    <SkeletonText /><Skeleton animation="shimmer" height="var(--control-h-md)" />
    <ProgressTrack label="리포트 준비 중" />
    <TaskProgress title="리포트 생성" value={value} steps={[{ label: '자료 확인', done: true }, { label: '문서 생성', done: value === 1 }]} />
    <Button onClick={() => setValue((current) => current === 1 ? .3 : 1)}>진행률 갱신</Button>
  </div>;
}
export const 모션_감소: Story = {
  render: () => <ReducedMotionDemo />,
  play: async ({ canvasElement }) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const node of canvasElement.querySelectorAll('[data-slot="skeleton"], [data-indeterminate], [data-slot="task-document"]')) {
        await expect(getComputedStyle(node).animationName).toBe('none');
        await expect(getComputedStyle(node).opacity).toBe('1');
      }
    }
    await userEvent.click(within(canvasElement).getByRole('button', { name: '진행률 갱신' }));
    await expect(within(canvasElement).getByRole('progressbar', { name: '모든 단계 완료' })).toHaveAttribute('aria-valuenow', '100');
    canvasElement.dataset.playComplete = 'true';
  },
};
