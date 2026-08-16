import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './state/settings'
import { ErrorBoundary } from './components/shell/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Docker-хост под рукой, ошибки чаще осмысленные, чем случайные.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
)
