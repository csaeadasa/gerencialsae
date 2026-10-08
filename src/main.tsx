import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/auth.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, 
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary 
      isRoot 
      sectionName="Aplicação Geral (Root)"
      fallbackTitle="Instabilidade no Carregamento do Sistema"
      fallbackMessage="Ocorreu uma falha inesperada durante a inicialização da aplicação. Você pode tentar recarregar a página ou copiar os detalhes técnicos para envio ao suporte."
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
