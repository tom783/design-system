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
function Failure() {
  const file = new File(['상품 이미지'], '상품-대표이미지.png', { type: 'image/png' });
  return <Controlled initial={[{ id: 'failed', file, status: 'error', error: '서버에 연결하지 못했습니다. 파일을 삭제한 뒤 다시 선택하세요.' }]} multiple />;
}
export const 사용법: Story = { parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } }, render: () => <FileUploadExample /> };
export const 여러파일: Story = { render: () => <FileUploadExample /> };
export const 대표이미지: Story = { render: () => <Field label="대표 이미지" description="JPG·PNG, 5MB 이하"><Controlled mode="image" accept="image/jpeg,image/png" maxSize={5_000_000} /></Field> };
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
