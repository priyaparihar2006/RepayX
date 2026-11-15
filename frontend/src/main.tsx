import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="RepayX encountered an error while starting up">
    <App />
  </ErrorBoundary>,
);
