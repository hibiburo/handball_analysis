import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { requestPersistentStorage } from '@/lib/storage';
import { App } from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root が見つかりません');
}

// ブラウザが空き容量などの理由でデータを自動で消さないよう、永続化を要求する（architecture.md 3.2）
void requestPersistentStorage();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
