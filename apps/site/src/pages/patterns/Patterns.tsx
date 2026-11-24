import * as React from 'react';
import { Link, useParams } from 'react-router';
import { EmptyState, PageHeader, SectionHeader, Skeleton } from '@s2life/ui';
import { loadStoryFile, screenFileNames, type StoryFile } from '../../stories/load';
import { StoryExample, storiesOf } from '../../stories/render';

/**
 * 패턴 — 부품을 조립한 화면 예시. 조립 화면 스토리(screens-*.stories.tsx)를 그대로 렌더한다.
 * 안내 문안은 다음 단계에서 채운다.
 */
function useStoryFile(name: string | undefined) {
  const [file, setFile] = React.useState<StoryFile | null | undefined>(undefined);
  React.useEffect(() => {
    let live = true;
    setFile(undefined);
    if (name) loadStoryFile(name).then((loaded) => { if (live) setFile(loaded); });
    return () => { live = false; };
  }, [name]);
  return file;
}

function ScreenList() {
  return <SectionHeader title="조립 화면" count={screenFileNames.length}>
    <ul className="site-list">
      {screenFileNames.map((file) => <li key={file}><Link className="site-link" to={`/patterns/${file.replace(/\.stories\.tsx$/, '')}`}>{file}</Link></li>)}
    </ul>
  </SectionHeader>;
}

function Screen({ name }: { name: string }) {
  const file = useStoryFile(`${name}.stories.tsx`);
  if (file === undefined) return <Skeleton variant="block" height="var(--space-64)" />;
  if (file === null) return <EmptyState title="없는 화면" description={`${name}.stories.tsx 가 없다.`} />;
  const entries = storiesOf(file);
  return <SectionHeader title={file.module.default.title ?? name} description={`packages/ui/src/stories/${file.file}`} count={entries.length}>
    <div className="site-stack">
      {entries.map((entry, i) => <StoryExample key={entry.id} entry={entry} eager={i === 0} frame="screen" />)}
    </div>
  </SectionHeader>;
}

export function PatternsPage() {
  const { screen } = useParams();
  return <div className="site-page">
    <PageHeader title="패턴" />
    {screen ? <Screen name={screen} /> : <ScreenList />}
  </div>;
}
