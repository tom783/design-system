import { useEffect, useState } from 'react';
import { Field, FileUpload, type FileUploadItem } from '../../src';

// 이 예시의 가짜 전송을 앱의 요청으로 바꾼다. id로 항목을 찾아 진행률·결과만 갱신한다.
function fakeUpload(progress: number) { return Math.min(1, progress + 0.1); }
export function FileUploadExample() {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  useEffect(() => {
    const timer = setInterval(() => setFiles(current => !current.some(item => item.status === 'uploading') ? current : current.map(item => {
      if (item.status !== 'uploading') return item;
      const progress = fakeUpload(item.progress ?? 0);
      return { ...item, progress, status: progress >= 1 ? 'success' : 'uploading' };
    })), 400);
    return () => clearInterval(timer);
  }, []);
  return <Field label="상품 이미지" description="JPG·PNG, 파일당 5MB 이하, 최대 3개">
    <FileUpload multiple accept="image/jpeg,image/png" maxSize={5_000_000} maxFiles={3} value={files}
      onValueChange={next => setFiles(next.map(item => item.status ? item : { ...item, status: 'uploading', progress: 0 }))} />
  </Field>;
}
