import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import { toast } from "@/components/ui";

export type ImageSource = "camera" | "library";

/**
 * Opens the camera or the photo library; resolves to the picked images, or
 * [] if cancelled/denied. The library needs no permission prompt: the system
 * picker only hands the app what the user chose. The camera does.
 */
export async function pickImages(
  source: ImageSource,
  { limit = 1, square = false }: { limit?: number; square?: boolean } = {},
): Promise<ImagePicker.ImagePickerAsset[]> {
  // exif: false = don't even read the metadata; quality 1 = no lossy pass here
  // (prepareImage does the one re-encode, so photos aren't compressed twice)
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
    exif: false,
    // The system's square crop UI, for avatars. iOS can't crop multiple picks.
    ...(square ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
  };

  let result: ImagePicker.ImagePickerResult;
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.error("Camera access is off. You can turn it on in Settings.");
      if (!permission.canAskAgain) void Linking.openSettings();
      return [];
    }
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync({
      ...options,
      ...(limit > 1 && !square ? { allowsMultipleSelection: true, selectionLimit: limit } : {}),
    });
  }
  return result.canceled ? [] : result.assets.slice(0, limit);
}
