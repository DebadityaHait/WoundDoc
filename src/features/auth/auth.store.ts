import { create } from "zustand";

import { authRepository } from "@/src/features/auth/auth.repository";
import { AuthSession } from "@/src/features/auth/auth.types";
import { createId, isNonEmpty } from "@/src/lib/validators";

type AuthStore = {
  session: AuthSession | null;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  isHydrating: true,
  hydrate: async () => {
    const session = await authRepository.getSession();
    set({ session, isHydrating: false });
  },
  signIn: async (email, password) => {
    if (!isNonEmpty(email) || !isNonEmpty(password)) {
      throw new Error("Email and password are required.");
    }

    const session: AuthSession = {
      token: createId("local_token"),
      email: email.trim(),
      signedInAt: new Date().toISOString(),
    };

    await authRepository.saveSession(session);
    set({ session });
  },
  signOut: async () => {
    await authRepository.clearSession();
    set({ session: null });
  },
}));
