import * as React from 'react';
import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { themes } from 'storybook/theming';
import design from '../../../DESIGN.md?raw';

/** 절의 본문은 복사하지 않고 현재 원본의 해당 줄로 연결한다. */
export function DesignLink({ section, children }: React.PropsWithChildren<{ section: string }>) {
  const line = design.split('\n').findIndex(text => new RegExp(`^#{2,4} ${section.replaceAll('.', '\\.')}[. ]`).test(text));
  if (line < 0) throw new Error(`문서: DESIGN.md §${section}을 찾을 수 없습니다.`);
  return <a href={`https://github.com/tom783/design-system/blob/main/DESIGN.md#L${line + 1}`} target="_blank" rel="noreferrer">{children ?? `DESIGN.md §${section}`}</a>;
}

/** 스토리가 없는 MDX도 툴바의 테마를 받는다. 전역 Storybook 설정은 바꾸지 않는다. */
export function DocumentationContainer({ context, children }: React.PropsWithChildren<DocsContainerProps>) {
  const [theme, setTheme] = React.useState(() => {
    const globals = new URLSearchParams(window.location.search).get('globals') ?? '';
    const requested = globals.split(';').find(value => value.startsWith('theme:'))?.slice(6);
    // 문서로 들어오기 전에 전송된 테마도 채널의 마지막 이벤트에서 복원한다.
    const previous = context.channel.last(GLOBALS_UPDATED)?.[0] ?? context.channel.last(SET_GLOBALS)?.[0];
    const value = requested ?? previous?.globals?.theme ?? context.projectAnnotations.initialGlobals?.theme;
    return value === 'dark' ? 'dark' : 'light';
  });
  React.useEffect(() => {
    const update = ({ globals }: { globals: Record<string, unknown> }) => setTheme(globals.theme === 'dark' ? 'dark' : 'light');
    context.channel.on(GLOBALS_UPDATED, update);
    return () => { context.channel.off(GLOBALS_UPDATED, update); };
  }, [context]);
  React.useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return <DocsContainer context={context} theme={theme === 'dark' ? themes.dark : themes.light}>
    <style>{`
      .sbdocs-wrapper { background: var(--bg-canvas); }
      [data-doc-page] { color: var(--text-primary); }
      [data-doc-page] [data-manifest-props] { min-width: 0; margin-block: var(--space-24); }
      [data-doc-page] .manifest-props-scroll { overflow-x: auto; }
      [data-doc-page] [data-manifest-props] td { overflow-wrap: anywhere; }
      [data-doc-page] .intent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); gap: var(--space-16); }
      [data-doc-page] .intent-block { min-width: 0; padding: var(--space-16); border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface); overflow-wrap: anywhere; }
      [data-doc-page] .intent-block h3 { margin-top: 0; font-size: var(--text-title-sm); line-height: var(--text-title-sm-lh); font-weight: var(--text-title-sm-weight); }
      [data-doc-page] .intent-block h4 { margin-top: var(--space-16); font-weight: var(--text-caption-weight); }
      [data-doc-page] .intent-block ul { list-style: disc; padding-left: var(--space-24); margin-block: var(--space-8); }
      [data-doc-page] .intent-block a { color: var(--text-link); text-decoration: underline; }
    `}</style>
    {children}
  </DocsContainer>;
}
