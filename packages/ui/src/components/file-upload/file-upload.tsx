import * as React from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, File as FileIcon, Upload, Trash2 } from 'lucide-react';
import { Button } from '../button';
import { StatusChip } from '../status-chip';
import { Thumbnail } from '../thumbnail';
import { ProgressTrack } from '../loading';
import { FieldErrorContext } from '../form/field-error-context';
import { FieldLabelContext } from '../form/field-label-context';
import { cn } from '../../lib/cn';
import { formatFileSize, validateFiles } from './file-validation';

export interface FileUploadItem {
  /** 파일명이 중복되어도 앱이 전송 결과를 같은 항목에 반영할 수 있는 고유 키. */
  id: string;
  file: File;
  /** 생략하면 ready. 전송 시작·완료·실패 전환은 앱이 정한다. */
  status?: 'ready' | 'uploading' | 'success' | 'error';
  /** 0~1. uploading에서 생략하면 불확정 진행률이다. */
  progress?: number;
  /** 실패 이유와 고치는 방법. 있으면 status보다 우선하여 오류로 표시한다. */
  error?: string;
}
export interface FileUploadProps extends React.AriaAttributes {
  value: FileUploadItem[];
  onValueChange: (value: FileUploadItem[]) => void;
  accept?: string;
  /** 바이트. 5MB는 5_000_000이다. */
  maxSize?: number;
  multiple?: boolean;
  maxFiles?: number;
  /** image는 multiple 없이 대표 이미지 선택에 쓴다. */
  mode?: 'files' | 'image';
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  label?: string;
  className?: string;
}

function FilePreview({ file, large = false }: { file: File; large?: boolean }) {
  const [preview, setPreview] = React.useState<{ file: File; url: string }>();
  React.useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    // 파일 교체·항목 제거·언마운트마다 이 effect가 만든 URL만 해제한다. 렌더 중에는 생성하지 않는다.
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!file.type.startsWith('image/')) return <FileIcon aria-hidden="true" size={24} />;
  return <Thumbnail src={preview?.file === file ? preview.url : undefined} alt={file.name} ratio={large ? '16/9' : '1/1'} className={large ? 'file-upload-cover' : 'file-upload-thumbnail'} />;
}
function FileStatus({ item }: { item: FileUploadItem }) {
  const state = item.error ? 'error' : item.status ?? 'ready';
  return <div data-slot="file-upload-status" className="file-upload-status">
    <StatusChip tone={state === 'error' ? 'danger' : state === 'success' ? 'success' : state === 'uploading' ? 'info' : 'neutral'}>
      {state === 'error' ? '업로드 실패' : state === 'success' ? '업로드 완료' : state === 'uploading' ? '업로드 중' : '전송 대기'}
    </StatusChip>
    {state === 'uploading' && <ProgressTrack value={item.progress} label={`${item.file.name} 업로드`} />}
    {state === 'error' && <span data-slot="file-upload-item-error" className="file-upload-error"><CircleAlert aria-hidden="true" size={16} />{item.error || '업로드하지 못했습니다. 파일을 삭제한 뒤 다시 선택하세요.'}</span>}
  </div>;
}

export function FileUpload({ value, onValueChange, accept, maxSize, multiple = false, maxFiles, mode = 'files', disabled = false,
  required, id, name, label = '파일 선택', className, ...aria }: FileUploadProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const ownErrorId = `${generatedId}-error`;
  const fieldError = React.useContext(FieldErrorContext);
  const fieldLabel = React.useContext(FieldLabelContext);
  const input = React.useRef<HTMLInputElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const dragDepth = React.useRef(0);
  const [dragging, setDragging] = React.useState(false);
  const [rejections, setRejections] = React.useState<{ name: string; reason: string }[]>([]);
  const [announcement, setAnnouncement] = React.useState({ text: '', sequence: 0 });
  const singleImage = mode === 'image' && !multiple;
  const acceptedTypes = accept ?? (mode === 'image' ? 'image/*' : undefined);
  const selected = singleImage ? value[0] : undefined;
  const invalid = Boolean(rejections.length || aria['aria-invalid'] === true || aria['aria-invalid'] === 'true');
  const describedBy = [...new Set([rejections.length ? fieldError?.id ?? ownErrorId : '', ...(aria['aria-describedby']?.split(/\s+/) ?? [])].filter(Boolean))].join(' ') || undefined;
  const accessible = { ...aria, 'aria-describedby': describedBy, 'aria-invalid': invalid || undefined,
    'aria-labelledby': aria['aria-labelledby'] ?? (aria['aria-label'] ? undefined : fieldLabel), 'aria-label': aria['aria-label'] ?? (fieldLabel ? undefined : label) };
  const announce = (text: string) => setAnnouncement(previous => ({ text, sequence: previous.sequence + 1 }));
  const choose = () => { if (!disabled) input.current?.click(); };
  const add = (files: File[]) => {
    if (disabled || !files.length) return;
    const result = validateFiles(files, { accept: acceptedTypes, maxSize, multiple, maxFiles, count: value.length });
    setRejections(result.rejected.map(({ file, reason }) => ({ name: file.name, reason })));
    if (result.accepted.length) {
      const items = result.accepted.map(file => ({ id: crypto.randomUUID(), file }));
      onValueChange(multiple ? [...value, ...items] : items);
    }
    announce(`${result.accepted.length ? `${result.accepted.length}개 파일 ${!multiple && value.length ? '변경' : '추가'}. ` : ''}${result.rejected.length ? `${result.rejected.length}개 파일 거절. ${[...new Set(result.rejected.map(item => item.reason))].join('. ')}` : ''}`);
  };
  const remove = (item: FileUploadItem) => {
    if (disabled) return;
    onValueChange(value.filter(entry => entry.id !== item.id));
    setRejections([]);
    announce(`${item.file.name} 삭제. ${value.length - 1}개 파일 남음.`);
    // 삭제 버튼이 DOM에서 사라져 BODY로 빠지지 않도록 항상 남는 선택 버튼으로 복귀한다.
    trigger.current?.focus({ preventScroll: true });
  };
  const errorContent = <div data-slot="file-upload-error" className="file-upload-error"><CircleAlert aria-hidden="true" size={16} /><ul>
    {rejections.map((item, index) => <li key={index}><span title={item.name} className="file-upload-rejected-name">{item.name}</span>: {item.reason}</li>)}
  </ul></div>;
  return <div data-slot="file-upload" className={cn('file-upload', className)} data-disabled={disabled || undefined}>
    {/* Field의 htmlFor는 실제 입력을 가리킨다. 키보드는 보이는 네이티브 버튼 한 곳에 둔다. */}
    <input ref={input} id={inputId} data-slot="file-upload-input" type="file" className="sr-only" tabIndex={-1}
      name={name} accept={acceptedTypes} multiple={multiple} disabled={disabled} aria-required={required || undefined} {...accessible}
      onChange={event => { add(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
    <div data-slot="file-upload-dropzone" className="file-upload-dropzone" data-dragging={!disabled && dragging || undefined} aria-disabled={disabled || undefined}
      onDragEnter={event => { event.preventDefault(); if (!disabled && Array.from(event.dataTransfer.types).includes('Files')) { dragDepth.current++; setDragging(true); } }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'; }}
      onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); add(Array.from(event.dataTransfer.files)); }}>
      {selected && <FilePreview file={selected.file} large />}
      <Button ref={trigger} data-slot="file-upload-trigger" className={selected ? undefined : 'file-upload-pick'} disabled={disabled} {...accessible}
        aria-labelledby={accessible['aria-labelledby'] ? `${accessible['aria-labelledby']} ${generatedId}-action` : undefined}
        aria-label={accessible['aria-labelledby'] ? undefined : selected ? `${accessible['aria-label']} 바꾸기` : accessible['aria-label']}
        aria-required={required || undefined} onClick={choose} leadingIcon={selected ? undefined : <Upload aria-hidden="true" />}>
        <span id={`${generatedId}-action`}>{selected ? '바꾸기' : label}</span>
      </Button>
      {!selected && <span className="file-upload-hint">{dragging && !disabled ? '여기에 파일을 놓으세요' : '파일을 끌어 놓거나 눌러서 선택하세요'}</span>}
      {selected && <>
        <span data-slot="file-upload-name" className="file-upload-name" title={selected.file.name}>{selected.file.name}</span>
        <span className="tabular">{formatFileSize(selected.file.size)}</span>
        <FileStatus item={selected} />
        <Button size="sm" variant="ghost" disabled={disabled} aria-label={`${selected.file.name} 삭제`} onClick={() => remove(selected)} leadingIcon={<Trash2 aria-hidden="true" />}>삭제</Button>
      </>}
    </div>
    {!singleImage && value.length > 0 && <ul data-slot="file-upload-list" className="file-upload-list">
      {value.map(item => <li key={item.id} data-slot="file-upload-item" className="file-upload-item">
        <FilePreview file={item.file} />
        <div className="file-upload-details">
          <span data-slot="file-upload-name" className="file-upload-name" title={item.file.name}>{item.file.name}</span>
          <span data-slot="file-upload-size" className="tabular file-upload-hint">{formatFileSize(item.file.size)}</span>
          <FileStatus item={item} />
        </div>
        <Button size="sm" variant="ghost" iconOnly disabled={disabled} aria-label={`${item.file.name} 삭제`} onClick={() => remove(item)} leadingIcon={<Trash2 aria-hidden="true" />} />
      </li>)}
    </ul>}
    {fieldError ? fieldError.container && !fieldError.hasError && rejections.length > 0 && createPortal(errorContent, fieldError.container)
      : <div data-slot="file-upload-errors" id={ownErrorId} className="file-upload-errors">{rejections.length > 0 && errorContent}</div>}
    <div data-slot="file-upload-announcement" className="sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={announcement.sequence}>{announcement.text}</span></div>
  </div>;
}
