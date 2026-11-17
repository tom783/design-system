import * as React from 'react';
import { PictureInPicture2, X } from 'lucide-react';
import { Button } from '../button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../dialog';
import { Skeleton } from '../loading';
import { ErrorState } from '../state';

export type Media =
  | { type: 'image'; src: string; alt: string; width?: number; height?: number }
  | { type: 'video'; src: string; poster?: string;
      captions?: { src: string; lang: string; label: string }[];
      /** 브라우저의 PiP 금지 설정을 네이티브 video에도 전달한다. */
      disablePictureInPicture?: boolean };

export interface MediaViewerProps {
  media: Media;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** popup은 모달 확대, floating은 페이지를 계속 사용하는 구석 창이다. */
  mode?: 'popup' | 'floating';
  placement?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';
  title?: string;
}

function MediaBody({ media, label }: { media: Media; label: string }) {
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>(
    media.type === 'image' && !media.src.trim() ? 'error' : 'loading');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [pipAvailable, setPipAvailable] = React.useState(false);
  const [inPip, setInPip] = React.useState(false);
  const [pipBusy, setPipBusy] = React.useState(false);
  const [pipError, setPipError] = React.useState('');
  const disabled = media.type === 'video' && media.disablePictureInPicture;

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => {
      setPipAvailable(Boolean(document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function' && !video.disablePictureInPicture));
      setInPip(document.pictureInPictureElement === video);
    };
    sync();
    video.addEventListener('enterpictureinpicture', sync);
    video.addEventListener('leavepictureinpicture', sync);
    // 앱이 네이티브 속성을 변경한 경우에도 금지된 버튼을 남기지 않는다.
    const observer = new MutationObserver(sync);
    observer.observe(video, { attributes: true, attributeFilter: ['disablepictureinpicture'] });
    return () => {
      observer.disconnect();
      video.removeEventListener('enterpictureinpicture', sync);
      video.removeEventListener('leavepictureinpicture', sync);
      video.pause();
      if (document.pictureInPictureElement === video) void document.exitPictureInPicture().catch(() => {});
    };
  }, []);

  async function togglePip() {
    const video = videoRef.current;
    if (!video || video.disablePictureInPicture) return;
    setPipBusy(true); setPipError('');
    try {
      // await 전 곧바로 요청해야 실제 클릭의 사용자 활성화를 잃지 않는다.
      if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      setPipError('화면 속 화면을 전환하지 못했습니다. 영상을 재생한 뒤 다시 시도하세요.');
    } finally { setPipBusy(false); }
  }

  // 치수를 모르면 16:9로 예약한다. 로드 후에도 비율을 바꾸지 않아 레이아웃 이동이 없다.
  const ratio = media.type === 'image' && Number.isFinite(media.width) && Number.isFinite(media.height)
    && media.width! > 0 && media.height! > 0 ? media.width! / media.height! : 16 / 9;
  return <div data-slot="media-viewer-body" className="ds-media-viewer-body">
    <div data-slot="media-viewer-stage" data-state={status} className="ds-media-viewer-stage"
      style={{ '--media-viewer-ratio': ratio } as React.CSSProperties} aria-busy={status === 'loading'}>
      {status === 'error' ? <ErrorState title="미디어를 불러오지 못했습니다" description="파일 주소와 접근 권한을 확인한 뒤 다시 열어주세요." />
        : media.type === 'image'
          ? <img data-slot="media-viewer-image" src={media.src} alt={media.alt} width={media.width} height={media.height}
              decoding="async" onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} />
          : <video ref={videoRef} data-slot="media-viewer-video" src={media.src || undefined} poster={media.poster}
              aria-label={label} controls preload="metadata" disablePictureInPicture={disabled}
              onLoadedMetadata={() => setStatus('loaded')} onError={() => setStatus('error')}>
              {media.captions?.map((caption, index) => <track key={`${caption.lang}-${caption.src}`} kind="captions"
                src={caption.src} srcLang={caption.lang} label={caption.label} default={index === 0} />)}
            </video>}
      {status === 'loading' && <>
        <Skeleton height="100%" />
        <span className="sr-only" role="status">미디어를 불러오는 중입니다.</span>
      </>}
    </div>
    {media.type === 'video' && status !== 'error' && pipAvailable && !disabled && <Button data-slot="media-viewer-pip"
      size="sm" variant="ghost" leadingIcon={<PictureInPicture2 aria-hidden="true" />} disabled={status !== 'loaded' || pipBusy}
      aria-label={inPip ? '화면 속 화면 끄기' : '화면 속 화면으로 보기'} aria-pressed={inPip} onClick={togglePip}>
      {inPip ? '화면 속 화면 끄기' : '화면 속 화면으로 보기'}
    </Button>}
    {pipError && <ErrorState className="ds-media-viewer-pip-error" title={pipError} />}
  </div>;
}

function FloatingViewer({ placement, label, onClose, children }: {
  placement: NonNullable<MediaViewerProps['placement']>; label: string; onClose: () => void; children: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  React.useLayoutEffect(() => {
    const panel = panelRef.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.showPopover();
    return () => {
      // 패널 자체의 수명과 연결해야 자식 제거로 activeElement가 body가 되기 전에 판단한다.
      // 바깥에서 작업 중인 사용자의 포커스는 그대로 둔다.
      const restore = panel.contains(document.activeElement);
      panel.hidePopover();
      if (restore && previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return <div ref={panelRef} data-slot="media-viewer" data-mode="floating" data-placement={placement}
    className="ds-media-viewer-floating" popover="manual" role="dialog" aria-labelledby={titleId}
    onKeyDown={event => {
      // 패널 안에서 처리되지 않은 Escape만 맡는다. 페이지·전체화면의 Escape는 보존한다.
      if (event.key === 'Escape' && !event.defaultPrevented && !event.nativeEvent.isComposing && !document.fullscreenElement) onClose();
    }}>
    <div data-slot="media-viewer-header" className="ds-media-viewer-header">
      <h2 id={titleId} title={label}>{label}</h2>
      <Button data-slot="media-viewer-close" variant="ghost" size="sm" iconOnly aria-label="닫기" onClick={onClose}><X aria-hidden="true" /></Button>
    </div>
    {children}
  </div>;
}

export function MediaViewer({ media, open, onOpenChange, mode = 'popup', placement = 'bottom-end', title }: MediaViewerProps) {
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const label = title || (media.type === 'image' ? media.alt || '이미지 보기' : '동영상 보기');
  React.useLayoutEffect(() => {
    if (open && mode === 'popup') returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [open, mode]);

  // 소스/유형이 바뀌면 이전 요청 상태와 비디오를 함께 폐기한다.
  const body = <MediaBody key={`${media.type}:${media.src}`} media={media} label={label} />;
  if (mode === 'popup') return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent size="wide" aria-describedby={undefined} className="ds-media-viewer-popup"
      onCloseAutoFocus={event => {
        event.preventDefault();
        if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
      }}>
      <div data-slot="media-viewer" data-mode="popup">
        <DialogHeader><DialogTitle title={label}>{label}</DialogTitle></DialogHeader>
        {body}
      </div>
    </DialogContent>
  </Dialog>;

  return open ? <FloatingViewer placement={placement} label={label} onClose={() => onOpenChange(false)}>{body}</FloatingViewer> : null;
}
