import { useAuth as useFirebaseAuth } from '@/contexts/AuthContext';

export function useAuth() {
  return useFirebaseAuth();
}
