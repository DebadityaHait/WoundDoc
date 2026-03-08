import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuthStore } from "@/src/features/auth/auth.store";
import { colors } from "@/src/theme/colors";

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((state) => state.session);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [isHydrating, router, segments, session]);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  );
}
