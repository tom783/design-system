import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // 문서 페이지(.mdx)와 스토리를 함께 집는다. 문서는 docs/ 아래에 둔다.
  stories: ['../packages/ui/src/**/*.stories.@(ts|tsx)', '../packages/ui/docs/**/*.mdx'],
  addons: ['@storybook/addon-docs'],
  framework: { name: '@storybook/react-vite', options: {} },
};
export default config;
