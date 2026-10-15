import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Controller, useForm, type Path } from "react-hook-form";
import { StyleSheet, Text, type TextInputProps } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useRegister } from "@/features/auth/hooks";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import { useServerErrors } from "@/features/auth/useServerErrors";
import { colors } from "@/theme";

const FIELDS = ["displayName", "username", "email", "password"] as const;

// Data-driven fields: four inputs without four copies of the same JSX
const fieldConfig: { name: Path<RegisterInput>; label: string; props: TextInputProps }[] = [
  { name: "displayName", label: "Name", props: { autoComplete: "name", textContentType: "name" } },
  {
    name: "username",
    label: "Username",
    props: { autoCapitalize: "none", autoCorrect: false, textContentType: "username" },
  },
  {
    name: "email",
    label: "Email",
    props: { autoCapitalize: "none", keyboardType: "email-address", autoComplete: "email", textContentType: "emailAddress" },
  },
  {
    name: "password",
    label: "Password",
    // "newPassword" lets iOS suggest a strong password and save it to the Keychain
    props: { secureTextEntry: true, autoComplete: "new-password", textContentType: "newPassword" },
  },
];

export default function RegisterScreen() {
  const register = useRegister();
  const { control, handleSubmit, setError, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", username: "", email: "", password: "" },
  });
  useServerErrors(register.error, setError, FIELDS);

  const onSubmit = handleSubmit((values) => register.mutate(values));

  return (
    <Screen>
      <Text style={styles.title}>Create account</Text>

      {fieldConfig.map(({ name, label, props }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field, fieldState }) => (
            <TextField
              label={label}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              {...props}
            />
          )}
        />
      ))}

      {formState.errors.root ? (
        <Text style={styles.formError} accessibilityRole="alert">
          {formState.errors.root.message}
        </Text>
      ) : null}

      <Button title="Sign up" onPress={onSubmit} loading={register.isPending} />

      <Link href="/login" style={styles.link}>
        Already have an account? Log in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "800", color: colors.text, marginBottom: 8 },
  formError: { color: colors.danger, fontSize: 14 },
  link: { color: colors.primary, textAlign: "center", fontSize: 15, padding: 8 },
});
