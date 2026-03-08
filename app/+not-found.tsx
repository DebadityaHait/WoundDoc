import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found.</Text>
        <Link href="/(app)" style={styles.link}>
          Go to dashboard
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
  },
});
