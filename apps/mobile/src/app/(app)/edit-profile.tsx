import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { z } from "zod";
import { Button } from "@/components/Button";
import { ErrorView, LoadingView } from "@/components/QueryState";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useMe } from "@/features/auth/hooks";
import { useServerErrors } from "@/features/auth/useServerErrors";
import { useUpdateMe } from "@/features/social/hooks";
import { colors } from "@/theme";

// Same limits as the server's PATCH /users/me schema
const editProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(50),
  bio: z.string().trim().max(160, "At most 160 characters"),
});
type EditProfileInput = z.infer<typeof editProfileSchema>;
const FIELDS = ["displayName", "bio"] as const;

export default function EditProfileScreen() {
  const me = useMe();
  if (me.isPending) return <LoadingView />;
  if (me.isError) return <ErrorView error={me.error} onRetry={() => me.refetch()} />;
  // Mount the form only once the user is loaded, so defaultValues are real
  return <EditProfileForm initial={{ displayName: me.data.displayName, bio: me.data.bio ?? "" }} />;
}

function EditProfileForm({ initial }: { initial: EditProfileInput }) {
  const updateMe = useUpdateMe();
  const { control, handleSubmit, setError, formState } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: initial,
  });
  useServerErrors(updateMe.error, setError, FIELDS);

  const onSubmit = handleSubmit((values) => updateMe.mutate(values, { onSuccess: () => router.back() }));

  return (
    <Screen>
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField label="Name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field, fieldState }) => (
          <TextField
            label="Bio"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            maxLength={160}
            placeholder="What are you training for?"
            style={styles.bio}
          />
        )}
      />
      {formState.errors.root ? <Text style={styles.formError}>{formState.errors.root.message}</Text> : null}
      <Button title="Save" onPress={onSubmit} loading={updateMe.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bio: { minHeight: 90, textAlignVertical: "top" },
  formError: { color: colors.danger, fontSize: 14 },
});
