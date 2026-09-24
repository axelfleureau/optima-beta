export const VIDEO_MULTIPART_THRESHOLD_BYTES = 90 * 1024 * 1024;
export const VIDEO_MULTIPART_PART_SIZE_BYTES = 8 * 1024 * 1024;
export const VIDEO_MULTIPART_MIN_PART_BYTES = 5 * 1024 * 1024;
export const VIDEO_MULTIPART_MAX_PART_BYTES = 16 * 1024 * 1024;
export const VIDEO_MULTIPART_MAX_PARTS = 10_000;

export function shouldUseVideoMultipartUpload(
  mediaType: "image" | "video",
  fileSize: number,
) {
  return (
    mediaType === "image" || fileSize >= VIDEO_MULTIPART_THRESHOLD_BYTES
  );
}
