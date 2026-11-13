import * as React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
import '../packages/ui/src/styles.css';

/**
 * 테마 전환은 html[data-theme] 속성으로 한다.
 * 토큰이 ① 미지정(prefers-color-scheme) ② 명시적 light ③ 명시적 dark
 * 세 상태를 모두 정의하고 있으므로, 여기서는 속성만 바꿔주면 된다.
 */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as 'light' | 'dark';
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return (
    <div className="bg-canvas text-fg min-h-dvh p-6">
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: { theme: 'light' },
  globalTypes: {
    theme: {
      description: '테마 — 라이트 우선 설계, 다크 동시 지원',
      toolbar: {
        title: '테마',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: '라이트' },
          { value: 'dark', title: '다크' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
  },
};
export default preview;
