import { Stack } from "expo-router";

import { colors } from "@/src/theme/colors";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "WoundDoc" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="wounds/new" options={{ title: "New Wound" }} />
      <Stack.Screen name="wounds/[woundId]" options={{ title: "Wound Detail" }} />
      <Stack.Screen name="wounds/add-observation" options={{ title: "Add Observation" }} />
    </Stack>
  );
}
