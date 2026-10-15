import { zodResolver } from "@hookform/resolvers/zod";
import { router, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, ScrollView } from "react-native";
import { z } from "zod";
import { Button, ErrorState, Input, KeyboardScreen, LoadingState, toast } from "@/components/ui";
import { useMe } from "@/features/auth/hooks";
import { FormErrorBanner } from "@/features/auth/components/FormErrorBanner";
import { useServerErrors } from "@/features/auth/useServerErrors";
import { useUpdateMe } from "@/features/social/hooks";
import { makeStyles } from "@/theme";

const BIO_MAX = 160;

// Same limits as the server's PATCH /users/me schema
const editProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(50),
  bio: z.string().trim().max(BIO_MAX, `At most ${BIO_MAX} characters`),
});
type EditProfileInput = z.infer<typeof editProfileSchema>;
const FIELDS = ["displayName", "bio"] as const;

export default function EditProfileScreen() {
  const me = useMe();
  if (me.isPending) return <LoadingState />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  // Mount the form only once the user is loaded, so defaultValues are real
  return <EditProfileForm initial={{ displayName: me.data.displayName, bio: me.data.bio ?? "" }} />;
}

function EditProfileForm({ initial }: { initial: EditProfileInput }) {
  const styles = useStyles();
  const updateMe = useUpdateMe();
  const { control, handleSubmit, setError, formState } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: initial,
  });
  useServerErrors(updateMe.error, setError, FIELDS);

  // Unsaved-changes guard: covers the back button, the iOS sheet swipe-down and
  // Android back. A ref (not state) marks a successful save, because the
  // router.back() right after it runs before React could re-render with isDirty=false.
  const navigation = useNavigation();
  const saved = useRef(false);
  usePreventRemove(formState.isDirty, ({ data }) => {
    if (saved.current) return navigation.dispatch(data.action);
    Alert.alert("Discard changes?", "Your edits to your profile haven't been saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Unchanged save flow; a toast confirms it
  const onSubmit = handleSubmit((values) =>
    updateMe.mutate(values, {
      onSuccess: () => {
        saved.current = true;
        toast.success("Profile updated");
        router.back();
      },
    }),
  );

  return (
    <KeyboardScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <Input
              label="Name"
              icon="person-outline"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoComplete="name"
              textContentType="name"
            />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field, fieldState }) => (
            <Input
              label="Bio"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              // A live count beats discovering the limit from an error message
              hint={`${field.value.length}/${BIO_MAX}`}
              multiline
              multilineHeight={96}
              maxLength={BIO_MAX}
              placeholder="What are you training for?"
            />
          )}
        />
        <FormErrorBanner message={formState.errors.root?.message} />
        <Button title="Save changes" size="lg" onPress={onSubmit} loading={updateMe.isPending} disabled={!formState.isDirty} />
      </ScrollView>
    </KeyboardScreen>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.lg },
}));
