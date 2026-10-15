import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, type TextInput } from "react-native";
import { Button, Input } from "@/components/ui";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { FormErrorBanner } from "@/features/auth/components/FormErrorBanner";
import { SocialLoginButtons } from "@/features/auth/components/SocialLoginButtons";
import { useLogin } from "@/features/auth/hooks";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { useServerErrors } from "@/features/auth/useServerErrors";
import { makeStyles } from "@/theme";

const FIELDS = ["email", "password"] as const;

export default function LoginScreen() {
  const styles = useStyles();
  const passwordRef = useRef<TextInput>(null);

  // ── Unchanged logic ──────────────────────────────────
  const login = useLogin();
  const { control, handleSubmit, setError, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  useServerErrors(login.error, setError, FIELDS);

  // On success, startSession flips auth status and the router guard navigates
  const onSubmit = handleSubmit((values) => login.mutate(values));
  // ─────────────────────────────────────────────────────

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to keep your streak going."
      footer={
        <Link href="/register" style={styles.footerText}>
          New here? <Text style={styles.footerLink}>Create an account</Text>
        </Link>
      }
    >
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next" // keyboard's return key jumps to password
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Input
            ref={passwordRef}
            label="Password"
            icon="lock-closed-outline"
            password
            placeholder="Your password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <FormErrorBanner message={formState.errors.root?.message} />

      <Button title="Log in" size="lg" onPress={onSubmit} loading={login.isPending} />

      <SocialLoginButtons />
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  footerText: { ...t.typography.body, color: t.colors.textMuted, padding: t.spacing.md },
  footerLink: { ...t.typography.bodyStrong, color: t.colors.primaryText },
}));
