import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useAuthStore } from './stores/useAuthStore';
import { installGlobalErrorHandlers } from './services/telemetry';
import { startBackgroundUpdateMonitor } from './services/appAutoUpdater';

// Integration plan Phase 1: validate any stored session against the deployed
// API at startup instead of trusting localStorage blindly.
installGlobalErrorHandlers();
useAuthStore.getState().restoreSession();
startBackgroundUpdateMonitor();

createRoot(document.getElementById('root')!).render(<App />);
