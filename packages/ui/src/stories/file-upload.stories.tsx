import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, FileUpload, type FileUploadItem, type FileUploadProps } from '../index';
import { FileUploadExample } from '../../docs/examples/file-upload';
import primarySource from '../../docs/examples/file-upload.tsx?raw';

const meta = { title: 'Components/FileUpload', component: FileUpload, tags: ['autodocs'], parameters: { manifest: ['FileUpload'] } } satisfies Meta<typeof FileUpload>;
export default meta;
type Story = StoryObj;
function Controlled({ initial = [], ...props }: Partial<FileUploadProps> & { initial?: FileUploadItem[] }) {
  const [value, setValue] = useState(initial);
  return <FileUpload value={value} onValueChange={setValue} {...props} />;
}
// 디코딩 가능한 실제 PNG를 로컬에서 만든다. 외부 이미지 요청이나 가짜 바이트에 의존하지 않는다.
function sampleImage(name: string, color = '#ca7890') {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#f1eeeb';
  context.fillRect(0, 0, 160, 90);
  context.fillStyle = color;
  context.fillRect(48, 14, 64, 62);
  context.fillStyle = '#ffffff';
  context.fillRect(60, 36, 40, 18);
  const bytes = Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]!), character => character.charCodeAt(0));
  return new File([bytes], name, { type: 'image/png' });
}
function FilledFiles() {
  const [initial] = useState<FileUploadItem[]>(() => [
    { id: 'complete', file: sampleImage('상품-대표이미지.png'), status: 'success' },
    { id: 'uploading', file: sampleImage('상품-상세컷.png', '#7397ae'), status: 'uploading', progress: 0.42 },
    { id: 'failed', file: sampleImage('상품-포장.png', '#a79776'), status: 'error', error: '서버에 연결하지 못했습니다. 파일을 삭제한 뒤 다시 선택하세요.' },
  ]);
  return <Field label="상품 이미지" description="JPG·PNG, 파일당 5MB 이하, 최대 3개">
    <Controlled initial={initial} multiple accept="image/jpeg,image/png" maxSize={5_000_000} maxFiles={3} />
  </Field>;
}
function CoverImage() {
  const [initial] = useState<FileUploadItem[]>(() => [{ id: 'cover', file: sampleImage('상품-대표이미지.png'), status: 'success' }]);
  return <Field label="대표 이미지" description="JPG·PNG, 5MB 이하">
    <Controlled initial={initial} mode="image" accept="image/jpeg,image/png" maxSize={5_000_000} />
  </Field>;
}
function Failure() {
  const [initial] = useState<FileUploadItem[]>(() => [{ id: 'failed', file: sampleImage('상품-대표이미지.png'), status: 'error', error: '서버에 연결하지 못했습니다. 파일을 삭제한 뒤 다시 선택하세요.' }]);
  return <Controlled initial={initial} multiple />;
}
export const 사용법: Story = { parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } }, render: () => <FileUploadExample /> };
export const 여러파일: Story = { render: () => <FilledFiles /> };
export const 대표이미지: Story = { render: () => <CoverImage /> };
export const 거절: Story = { render: () => <Controlled multiple accept="image/jpeg,image/png" maxSize={5_000_000} maxFiles={3} /> };
export const 업로드실패: Story = { render: () => <Failure /> };
export const 비활성: Story = { render: () => <Controlled disabled multiple initial={[{ id: 'disabled', file: new File(['내용'], '일괄등록.xlsx'), status: 'ready' }]} /> };
export const Field안: Story = { render: () => <Field required label="일괄 등록 파일" description="XLSX, 5MB 이하"><Controlled accept=".xlsx" maxSize={5_000_000} /></Field> };
export const Field오류: Story = { render: () => <Field label="첨부" description="이미지 파일" error="첨부 권한이 없습니다"><Controlled multiple accept="image/png" /></Field> };

// 외부 응답·화면 이탈 때에도 URL을 정리하는 제어 경로. Primary에는 이 조작기를 넣지 않는다.
function Lifecycle() {
  const [value, setValue] = useState<FileUploadItem[]>([]);
  const [visible, setVisible] = useState(true);
  return <div className="flex flex-col gap-3">
    <button type="button" onClick={() => setValue(current => current.map(item => ({ ...item, file: new File([item.file], '바뀐-이미지.png', { type: 'image/png' }) })))}>외부 파일 교체</button>
    <button type="button" onClick={() => setVisible(false)}>입력 닫기</button>
    {visible && <FileUpload mode="image" value={value} onValueChange={setValue} />}
  </div>;
}
export const 외부변경: Story = { render: () => <Lifecycle /> };
