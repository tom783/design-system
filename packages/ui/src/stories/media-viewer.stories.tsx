import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, MediaViewer, type Media, type MediaViewerProps } from '../index';

const meta = { title: 'Components/MediaViewer', component: MediaViewer } satisfies Meta<typeof MediaViewer>;
export default meta;
type Story = StoryObj;
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#eeeeee"/><rect x="180" y="120" width="440" height="360" rx="12" fill="#777777"/><text x="400" y="320" text-anchor="middle" fill="white" font-size="48">800 × 600</text></svg>')}`;
const captions = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:01:00.000\n출고 작업 안내 영상입니다.\n')}`;
const placements = ['bottom-end', 'bottom-start', 'top-end', 'top-start'] as const;

function Demo({ kind = 'image', mode = 'popup', delayed = false, failure = false, disablePictureInPicture = false, title = '출고 안내 미디어' }:
  { kind?: 'image' | 'video'; mode?: MediaViewerProps['mode']; delayed?: boolean; failure?: boolean; disablePictureInPicture?: boolean; title?: string }) {
  const [open, setOpen] = React.useState(false);
  const [basic, setBasic] = React.useState(false);
  const [ready, setReady] = React.useState(!delayed);
  const [placement, setPlacement] = React.useState<MediaViewerProps['placement']>('bottom-end');
  const [escaped, setEscaped] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open || kind !== 'video' || !ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360;
    const context = canvas.getContext('2d')!;
    let frame = 0;
    const draw = () => {
      context.fillStyle = '#eeeeee'; context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#444444'; context.font = '28px sans-serif';
      context.fillText('출고 작업 안내 · 캔버스 스트림', 70, 170);
      context.fillRect(40 + (frame++ % 500), 240, 60, 30);
    };
    draw();
    const stream = canvas.captureStream(30);
    const timer = window.setInterval(draw, 33);
    let attached: HTMLVideoElement | null = null;
    const attach = () => {
      const viewer = mode === 'popup' ? document.querySelector('[data-slot="media-viewer"][data-mode="popup"]') : rootRef.current;
      const video = viewer?.querySelector<HTMLVideoElement>('[data-slot="media-viewer-video"]');
      if (video && video !== attached) {
        attached = video; video.muted = true; video.srcObject = stream;
      }
    };
    // Dialog는 포털 마운트가 지연될 수 있다. 타이머 추측 대신 실제 video 삽입을 기다린다.
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true }); attach();
    return () => {
      observer.disconnect(); window.clearInterval(timer);
      if (attached) { attached.pause(); attached.srcObject = null; }
      stream.getTracks().forEach(track => track.stop());
    };
  }, [open, kind, mode, ready]);

  const media: Media = kind === 'image'
    ? { type: 'image', src: failure ? 'data:image/png;base64,broken' : image, alt: '출고 상자 규격 안내 이미지', width: 800, height: 600 }
    : { type: 'video', src: '', poster: image, disablePictureInPicture,
        captions: [{ src: captions, lang: 'ko', label: '한국어' }] };
  return <div ref={rootRef} data-probe="media-demo" style={{ minHeight: mode === 'floating' ? '180vh' : undefined }}>
    <div className="flex flex-wrap items-center gap-3">
      <Button data-probe="open-media" onClick={() => { setReady(!delayed); setOpen(true); }}>미디어 열기</Button>
      <Button data-probe="open-basic" onClick={() => setBasic(true)}>기본 Dialog 열기</Button>
      {delayed && <Button data-probe="prepare-media" onClick={() => setReady(true)}>미디어 불러오기</Button>}
      <label>바깥 작업 입력<Input data-probe="outside-input" onKeyDown={event => { if (event.key === 'Escape') setEscaped(count => count + 1); }} /></label>
      <output data-probe="outside-escape">{escaped}</output>
    </div>
    {mode === 'floating' && <div className="mt-4 flex flex-wrap gap-2">{placements.map(value => <Button key={value}
      data-probe={`placement-${value}`} onClick={() => setPlacement(value)}>{value}</Button>)}</div>}
    <MediaViewer media={media} open={open} onOpenChange={setOpen} mode={mode} placement={placement} title={title} />
    <Dialog open={basic} onOpenChange={setBasic}><DialogContent aria-describedby={undefined}>
      <DialogHeader><DialogTitle>기본 폭 비교</DialogTitle></DialogHeader><p>기본 Dialog는 기존 36rem을 유지합니다.</p>
    </DialogContent></Dialog>
  </div>;
}

async function exercise(root: HTMLElement, kind: 'image' | 'video', mode: 'popup' | 'floating', delayed = false, failure = false) {
  const canvas = within(root), doc = within(root.ownerDocument.body);
  await userEvent.click(canvas.getByRole('button', { name: '미디어 열기' }));
  const stage = () => root.ownerDocument.querySelector('[data-slot="media-viewer-stage"]')!;
  await waitFor(() => expect(stage()).toBeVisible());
  if (delayed) {
    await expect(stage()).toHaveAttribute('data-state', 'loading');
    await expect(stage().querySelector('[data-slot="skeleton"]')).not.toBeNull();
    const height = stage().getBoundingClientRect().height;
    await userEvent.click(canvas.getByRole('button', { name: '미디어 불러오기' }));
    await waitFor(() => expect(stage()).toHaveAttribute('data-state', 'loaded'));
    await expect(stage().getBoundingClientRect().height).toBe(height);
  } else await waitFor(() => expect(stage()).toHaveAttribute('data-state', failure ? 'error' : 'loaded'));
  if (kind === 'video') {
    const video = root.ownerDocument.querySelector<HTMLVideoElement>('[data-slot="media-viewer-video"]')!;
    await expect(video.controls).toBe(true); await expect(video.autoplay).toBe(false); // srcObject(MediaStream)면 브라우저가 preload 를 무시하고 **프로퍼티**를 'none' 으로
    // 돌려준다(실측: attr=metadata / prop=none). 우리가 거는 것은 속성이므로 속성을 본다.
    await expect(video.getAttribute('preload')).toBe('metadata');
    // 재생은 테스트가 명시적으로 시작한다. 컴포넌트와 스트림 연결은 자동 재생하지 않는다.
    await video.play();
    if (video.disablePictureInPicture) await expect(root.ownerDocument.querySelector('[data-slot="media-viewer-pip"]')).toBeNull();
  }
  if (mode === 'floating') {
    const input = canvas.getByRole('textbox'); input.focus();
    await waitFor(() => expect(input).toHaveFocus());
  }
  await userEvent.click(doc.getByRole('button', { name: /^닫기$/ }));
  await waitFor(() => expect(root.ownerDocument.querySelector('[data-slot="media-viewer-stage"]')).toBeNull());
  root.dataset.playComplete = 'true';
}

export const 이미지팝업: Story = { render: () => <Demo />, play: ({ canvasElement }) => exercise(canvasElement, 'image', 'popup') };
export const 동영상팝업: Story = { render: () => <Demo kind="video" />, play: ({ canvasElement }) => exercise(canvasElement, 'video', 'popup') };
export const 이미지플로팅: Story = { render: () => <Demo mode="floating" />, play: ({ canvasElement }) => exercise(canvasElement, 'image', 'floating') };
export const 동영상플로팅: Story = { render: () => <Demo kind="video" mode="floating" />, play: ({ canvasElement }) => exercise(canvasElement, 'video', 'floating') };
export const 로딩: Story = { render: () => <Demo kind="video" mode="floating" delayed />, play: ({ canvasElement }) => exercise(canvasElement, 'video', 'floating', true) };
export const 오류: Story = { render: () => <Demo failure />, play: ({ canvasElement }) => exercise(canvasElement, 'image', 'popup', false, true) };
export const PiP불가: Story = { name: 'PiP불가', render: () => <Demo kind="video" disablePictureInPicture />, play: ({ canvasElement }) => exercise(canvasElement, 'video', 'popup') };
export const 긴제목: Story = { render: () => <Demo title={'서울 물류센터의 출고 작업과 포장 규격을 확인하는 안내 미디어 '.repeat(12)} />, play: ({ canvasElement }) => exercise(canvasElement, 'image', 'popup') };
