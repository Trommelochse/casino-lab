import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

// Create QueryClient with default polling configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000, // Poll every 5 seconds
      refetchIntervalInBackground: true, // Continue polling in background tabs
      staleTime: 0, // Data is always considered stale (always refetch)
      retry: 3, // Retry failed requests 3 times
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
