import { CarouselExample } from '../../docs/examples/carousel';
import primarySource from '../../docs/examples/carousel.tsx?raw';
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Carousel, CarouselSlide, MediaViewer, type CarouselProps } from '../index';

const meta = {
  tags: ['autodocs'],
  parameters: { manifest: ['Carousel', 'CarouselSlide'] }, title: 'Components/Carousel', component: Carousel } satisfies Meta<typeof Carousel>;
export default meta;
type Story = StoryObj;

const banners = ['출고 마감 시간 안내', '이번 달 프로모션', '신규 입고 상품'];
const bannerImage = (title: string) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#eeeeee"/><text x="400" y="210" text-anchor="middle" fill="#333333" font-size="36">${title}</text></svg>`
)}`;

function Demo({ links = false, media = false, single = false, ...props }:
  Partial<Omit<CarouselProps, 'children'>> & { links?: boolean; media?: boolean; single?: boolean }) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const items = single ? banners.slice(0, 1) : props.autoplay ? [...banners, '배송 휴무일 안내', '정산 일정 안내', '센터 운영 안내'] : banners;
  return <div data-probe="carousel-demo" style={{ width: 410, maxWidth: '100%' }}>
    <button type="button" data-probe="before" className="mb-3 text-fg-link underline">캐러셀 앞</button>
    <Carousel label="운영 안내 배너" {...props}>
      {items.map((title, position) => <CarouselSlide key={title}>
        {media ? <button type="button" data-probe="open-banner" className="block w-full cursor-pointer"
          aria-label={`배너 이미지 확대: ${title}`} onClick={() => setSelected(position)}>
          <img src={bannerImage(title)} alt={title} width={800} height={400} className="block h-auto w-full" />
        </button> : <div className="flex min-h-40 flex-col justify-center gap-3 bg-sunken p-4">
          <h3 className="text-[length:var(--text-title-sm)] font-semibold">{title}</h3>
          <p>운영에 필요한 소식 {position + 1}</p>
          {links && <a href="#banner-detail" onClick={event => event.preventDefault()}
            data-probe="banner-link" className="text-fg-link underline">{title} 자세히 보기</a>}
        </div>}
      </CarouselSlide>)}
    </Carousel>
    <button type="button" data-probe="after" className="mt-3 text-fg-link underline">캐러셀 뒤</button>
    {media && <MediaViewer media={{ type: 'image', src: bannerImage(items[selected ?? 0]!),
      alt: items[selected ?? 0]!, width: 800, height: 400 }} open={selected !== null}
      onOpenChange={open => { if (!open) setSelected(null); }} title="배너 이미지 확대" />}
  </div>;
}

async function ready(root: HTMLElement) {
  await waitFor(() => expect(root.querySelector('[data-slot="carousel-track"]')).toHaveAttribute('tabindex', '0'));
  await expect(root.querySelector('[data-slot="carousel-slide"]')).not.toHaveAttribute('tabindex');
  root.dataset.playComplete = 'true';
}

export const 사용법: Story = {
  parameters: { docs: { source: {
    code: primarySource.replace("from '../../src'", "from '@s2life/ui'"),
    language: 'tsx', type: 'code',
  } } },
  render: () => <CarouselExample />,
};

export const 기본: Story = { render: () => <Demo />, play: ({ canvasElement }) => ready(canvasElement) };
export const 자동재생: Story = { render: () => <Demo autoplay={1200} />, play: ({ canvasElement }) => ready(canvasElement) };
export const 점없음: Story = { render: () => <Demo showDots={false} />, play: ({ canvasElement }) => ready(canvasElement) };
export const 화살표없음: Story = { render: () => <Demo showArrows={false} />, play: ({ canvasElement }) => ready(canvasElement) };
export const 슬라이드하나: Story = { render: () => <Demo single />, play: ({ canvasElement }) => ready(canvasElement) };
export const 슬라이드안에링크: Story = { render: () => <Demo links />, play: ({ canvasElement }) => ready(canvasElement) };
export const MediaViewer조합: Story = { name: 'MediaViewer 조합', render: () => <Demo media />, play: ({ canvasElement }) => ready(canvasElement) };
