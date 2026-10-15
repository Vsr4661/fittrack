import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useLogin } from "@/features/auth/hooks";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { useServerErrors } from "@/features/auth/useServerErrors";
import { colors } from "@/theme";

const FIELDS = ["email", "password"] as const;

export default function LoginScreen() {
  const login = useLogin();
  const { control, handleSubmit, setError, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  useServerErrors(login.error, setError, FIELDS);

  // On success, startSession flips auth status and the router guard navigates
  const onSubmit = handleSubmit((values) => login.mutate(values));

  return (
    <Screen>
      <Text style={styles.title}>FitTrack</Text>
      <Text style={styles.subtitle}>Log in to track your training</Text>

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      {formState.errors.root ? (
        <Text style={styles.formError} accessibilityRole="alert">
          {formState.errors.root.message}
        </Text>
      ) : null}

      <Button title="Log in" onPress={onSubmit} loading={login.isPending} />

      <Link href="/register" style={styles.link}>
        New here? Create an account
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: 8 },
  formError: { color: colors.danger, fontSize: 14 },
  link: { color: colors.primary, textAlign: "center", fontSize: 15, padding: 8 },
});
