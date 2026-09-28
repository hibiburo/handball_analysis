import { lazy, Suspense, useState, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Layout } from '@/components/layout/Layout';
import { ToastProvider } from '@/components/ui/Toast';
import { GoalkeeperDetailPage } from '@/pages/GoalkeeperDetailPage';
import { GoalkeeperListPage } from '@/pages/GoalkeeperListPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RecordPage } from '@/pages/RecordPage';

// 分析画面と設定画面は初回表示に不要なため遅延読み込みにする（architecture.md 5章）
const AnalysisPage = lazy(() => import('@/pages/AnalysisPage').then((m) => ({ default: m.AnalysisPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<p className="p-6 text-muted">読み込み中…</p>}>{node}</Suspense>;
}

const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <GoalkeeperListPage /> },
      { path: '/goalkeepers/:goalkeeperId', element: <GoalkeeperDetailPage /> },
      { path: '/goalkeepers/:goalkeeperId/analysis', element: withSuspense(<AnalysisPage />) },
      { path: '/matches/:matchId/record', element: <RecordPage /> },
      { path: '/settings', element: withSuspense(<SettingsPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function App() {
  // ルーターは App の生成時に作る（モジュール読み込み時に作ると、その時点の URL に固定されテストで困るため）
  const [router] = useState(() => createBrowserRouter(routes));

  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
