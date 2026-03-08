import { AuthSession } from "@/src/features/auth/auth.types";
import { getJsonItem, removeItem, setJsonItem } from "@/src/services/storage/asyncStorage";

const AUTH_SESSION_KEY = "wounddoc:auth:session";

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  saveSession(session: AuthSession): Promise<void>;
  clearSession(): Promise<void>;
}

export class LocalAuthRepository implements AuthRepository {
  async getSession(): Promise<AuthSession | null> {
    return getJsonItem<AuthSession>(AUTH_SESSION_KEY);
  }

  async saveSession(session: AuthSession): Promise<void> {
    await setJsonItem(AUTH_SESSION_KEY, session);
  }

  async clearSession(): Promise<void> {
    await removeItem(AUTH_SESSION_KEY);
  }
}

// TODO: Replace with SupabaseAuthRepository when cloud auth is enabled.
export const authRepository: AuthRepository = new LocalAuthRepository();
