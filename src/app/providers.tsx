import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Backend, User } from '../data/backend';
import { ClockProvider } from './clock';
import { ToastProvider } from './toast';

const BackendContext = createContext<Backend | null>(null);

export function BackendProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

export function useBackend(): Backend {
  const backend = useContext(BackendContext);
  if (!backend) throw new Error('useBackend va usato dentro BackendProvider');
  return backend;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let active = true;
    backend
      .getUser()
      .then((user) => active && setState({ user, loading: false }))
      .catch(() => active && setState({ user: null, loading: false }));
    const off = backend.onAuthChange((user) => {
      if (!user) queryClient.clear();
      setState({ user, loading: false });
    });
    return () => {
      active = false;
      off();
    };
  }, [backend, queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  });
}

export function AppProviders({
  backend,
  queryClient,
  now,
  children,
}: {
  backend: Backend;
  queryClient?: QueryClient;
  now?: () => Date;
  children: ReactNode;
}) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <ClockProvider now={now}>
      <MotionConfig reducedMotion="user">
        <BackendProvider backend={backend}>
          <QueryClientProvider client={client}>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
            </AuthProvider>
          </QueryClientProvider>
        </BackendProvider>
      </MotionConfig>
    </ClockProvider>
  );
}
