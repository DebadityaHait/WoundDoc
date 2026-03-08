import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { isNonEmpty } from "@/src/lib/validators";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export default function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!isNonEmpty(email) || !isNonEmpty(password)) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/(app)");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to sign in.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={["#EBF7F3", "#F5FBFF", "#FFFFFF"]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>WoundDoc</Text>
          <Text style={styles.title}>Track healing over time</Text>
          <Text style={styles.subtitle}>Local demo mode. Supabase auth will be added later.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="Any password works"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton label="Sign in" loading={isSubmitting} onPress={onSubmit} />

          <Pressable>
            <Text style={styles.secondary}>For monitoring and educational use only.</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kicker: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    backgroundColor: "#FFFFFF",
  },
  secondary: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});
