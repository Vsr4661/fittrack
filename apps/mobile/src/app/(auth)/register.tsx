import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useRef } from "react";
import { Controller, useForm, type Path } from "react-hook-form";
import { Text, type TextInput, type TextInputProps } from "react-native";
import { Button, Input } from "@/components/ui";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { FormErrorBanner } from "@/features/auth/components/FormErrorBanner";
import { SocialLoginButtons } from "@/features/auth/components/SocialLoginButtons";
import { useRegister } from "@/features/auth/hooks";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import { useServerErrors } from "@/features/auth/useServerErrors";
import { makeStyles } from "@/theme";

const FIELDS = ["displayName", "username", "email", "password"] as const;

// Data-driven fields: four inputs without four copies of the same JSX
const fieldConfig: {
  name: Path<RegisterInput>;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  hint?: string;
  password?: boolean;
  props: TextInputProps;
}[] = [
  { name: "displayName", label: "Name", icon: "person-outline", placeholder: "Alex Johnson", props: { autoComplete: "name", textContentType: "name" } },
  {
    name: "username",
    label: "Username",
    icon: "at",
    placeholder: "alex_lifts",
    hint: "Letters, numbers and underscores",
    props: { autoCapitalize: "none", autoCorrect: false, textContentType: "username" },
  },
  {
    name: "email",
    label: "Email",
    icon: "mail-outline",
    placeholder: "you@example.com",
    props: { autoCapitalize: "none", keyboardType: "email-address", autoComplete: "email", textContentType: "emailAddress" },
  },
  {
    name: "password",
    label: "Password",
    icon: "lock-closed-outline",
    placeholder: "Create a password",
    hint: "At least 8 characters",
    password: true,
    // "newPassword" lets iOS suggest a strong password and save it to the Keychain
    props: { autoComplete: "new-password", textContentType: "newPassword" },
  },
];

export default function RegisterScreen() {
  const styles = useStyles();
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // ── Unchanged logic ──────────────────────────────────
  const register = useRegister();
  const { control, handleSubmit, setError, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", username: "", email: "", password: "" },
  });
  useServerErrors(register.error, setError, FIELDS);

  const onSubmit = handleSubmit((values) => register.mutate(values));
  // ─────────────────────────────────────────────────────

  return (
    <AuthLayout
      hero="compact"
      title="Create your account"
      subtitle="Log workouts, follow friends, beat your PRs."
      footer={
        <Link href="/login" style={styles.footerText}>
          Already have an account? <Text style={styles.footerLink}>Log in</Text>
        </Link>
      }
    >
      {fieldConfig.map(({ name, label, icon, placeholder, hint, password, props }, i) => {
        const isLast = i === fieldConfig.length - 1;
        return (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <Input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                label={label}
                icon={icon}
                placeholder={placeholder}
                hint={hint}
                password={password}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                // Return key walks through the fields, and submits on the last one
                returnKeyType={isLast ? "go" : "next"}
                submitBehavior={isLast ? "blurAndSubmit" : "submit"}
                onSubmitEditing={isLast ? onSubmit : () => inputRefs.current[i + 1]?.focus()}
                {...props}
              />
            )}
          />
        );
      })}

      <FormErrorBanner message={formState.errors.root?.message} />

      <Button title="Create account" size="lg" onPress={onSubmit} loading={register.isPending} />

      <SocialLoginButtons />
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  footerText: { ...t.typography.body, color: t.colors.textMuted, padding: t.spacing.md },
  footerLink: { ...t.typography.bodyStrong, color: t.colors.primaryText },
}));
