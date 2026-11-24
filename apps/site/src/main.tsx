// 소비 앱처럼 시작한다(README "기본 설치"): 글꼴 CSS → 디자인 시스템 styles.css 를 앱 루트에서 한 번.
// styles.css 는 앱 전체 preflight 를 포함한다 — 부품 전용 CSS 는 없다. 사이트 자체 배치는 그 뒤 site.css.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@s2life/ui/styles.css';
import './site.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { SiteShell } from './layout/SiteShell';
import { applyTheme, readTheme } from './layout/theme';
import { HomePage, NotFoundPage } from './pages/Menus';
import { AiPage } from './pages/ai/Ai';
import { ConceptPage } from './pages/concept/Concept';
import { StartPage } from './pages/start/Start';
import { FoundationsPage } from './pages/foundations/Foundations';
import { ComponentListPage } from './pages/components/ComponentList';
import { ComponentPage } from './pages/components/ComponentPage';
import { PatternsPage } from './pages/patterns/Patterns';

// 첫 그림 전에 고른 테마를 건다 — 반대 테마로 한 번 번쩍이지 않게.
applyTheme(readTheme());

const router = createBrowserRouter([{
  element: <SiteShell />,
  children: [
    { path: '/', element: <HomePage /> },
    { path: '/start', element: <StartPage /> },
    { path: '/concept', element: <ConceptPage /> },
    { path: '/foundations', element: <Navigate to="/foundations/color" replace /> },
    { path: '/foundations/:section', element: <FoundationsPage /> },
    { path: '/components', element: <ComponentListPage /> },
    { path: '/components/:name', element: <ComponentPage /> },
    { path: '/patterns', element: <PatternsPage /> },
    { path: '/patterns/:screen', element: <PatternsPage /> },
    { path: '/ai', element: <AiPage /> },
    { path: '*', element: <NotFoundPage /> },
  ],
}]);

createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>);
