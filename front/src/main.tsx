import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './state/settings'
import { ErrorBoundary } from './components/shell/ErrorBoundary'
import { AuthGate } from './components/auth/AuthGate'
import { ErrorLog } from './components/shell/ErrorLog'
import { installClientErrorHandlers } from './lib/clientErrors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Docker-хост под рукой, ошибки чаще осмысленные, чем случайные.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// До первого рендера: иначе ошибки на старте приложения пройдут мимо журнала.
installClientErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorLog />
    <ErrorBoundary>
      <SettingsProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>{(account, signOut) => <App account={account} onSignOut={signOut} />}</AuthGate>
        </QueryClientProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
)
