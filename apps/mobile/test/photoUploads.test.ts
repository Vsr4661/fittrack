import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { pendingPhotoState, resumePendingUploads, startPhotoUpload, usePhotoUploads } from "@/features/workouts/photoUploads";
import { uploadImage } from "@/features/uploads/uploadImage";

// The network pipeline (API + storage PUT) is tested on the server against
// real storage; here it's mocked, to test what the APP does with the outcome.
jest.mock("@/features/uploads/uploadImage", () => ({ uploadImage: jest.fn() }));
const mockUpload = uploadImage as jest.MockedFunction<typeof uploadImage>;

const draft = () => useWorkoutDraft.getState().draft!;
const statusOf = (id: string) => usePhotoUploads.getState().byId[id];

/** A promise we resolve/reject by hand, to observe the in-flight state. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockUpload.mockReset();
  usePhotoUploads.setState({ byId: {} });
  useWorkoutDraft.setState({ draft: null });
  useWorkoutDraft.getState().start();
});

it("shows progress while uploading, then stores the key and clears the status", async () => {
  const upload = deferred<string>();
  mockUpload.mockImplementation((_uri, _kind, opts) => {
    opts?.onProgress?.(0.5);
    return upload.promise;
  });
  const [photo] = useWorkoutDraft.getState().addPhotos(["file:///a.jpg"]);

  const done = startPhotoUpload(photo!);
  expect(statusOf(photo!.id)).toEqual({ state: "uploading", progress: 0.5 });
  expect(pendingPhotoState(draft().photos).uploading).toBe(1);

  upload.resolve("workout-photos/u/a.jpg");
  await done;
  expect(draft().photos[0]!.key).toBe("workout-photos/u/a.jpg");
  expect(statusOf(photo!.id)).toBeUndefined();
  expect(pendingPhotoState(draft().photos)).toEqual({ uploading: 0, failed: [] });
});

it("marks a failed upload, and a retry can succeed", async () => {
  mockUpload.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("k");
  const [photo] = useWorkoutDraft.getState().addPhotos(["file:///a.jpg"]);

  await startPhotoUpload(photo!);
  expect(statusOf(photo!.id)).toEqual({ state: "failed" });
  expect(pendingPhotoState(draft().photos).failed).toHaveLength(1);

  await startPhotoUpload(photo!);
  expect(draft().photos[0]!.key).toBe("k");
});

it("doesn't start a second upload of a photo already in flight", async () => {
  const upload = deferred<string>();
  mockUpload.mockReturnValue(upload.promise);
  const [photo] = useWorkoutDraft.getState().addPhotos(["file:///a.jpg"]);

  void startPhotoUpload(photo!);
  void startPhotoUpload(photo!);
  resumePendingUploads();

  expect(mockUpload).toHaveBeenCalledTimes(1);
  upload.resolve("k");
});

it("after a relaunch, resumes only photos that have no key", async () => {
  mockUpload.mockResolvedValue("new-key");
  const [done, pending] = useWorkoutDraft.getState().addPhotos(["file:///a.jpg", "file:///b.jpg"]);
  useWorkoutDraft.getState().setPhotoKey(done!.id, "old-key");

  resumePendingUploads();
  await Promise.resolve();
  await Promise.resolve();

  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(mockUpload).toHaveBeenCalledWith("file:///b.jpg", "WORKOUT_PHOTO", expect.anything());
  expect(draft().photos.map((p) => p.key)).toEqual(["old-key", "new-key"]);
  expect(pending).toBeDefined();
});

it("a photo removed mid-upload stays removed when the upload finishes", async () => {
  const upload = deferred<string>();
  mockUpload.mockReturnValue(upload.promise);
  const [photo] = useWorkoutDraft.getState().addPhotos(["file:///a.jpg"]);

  const done = startPhotoUpload(photo!);
  useWorkoutDraft.getState().removePhoto(photo!.id);
  upload.resolve("k");
  await done;

  expect(draft().photos).toEqual([]);
});
