const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export function getThumbUrl(imageUrl: string, width: number = 400): string {
  // Convert Supabase storage URL to render/image transform URL
  // From: .../storage/v1/object/public/photos/photos/xxx.jpg
  // To:   .../storage/v1/render/image/public/photos/photos/xxx.jpg?width=400&quality=75
  if (imageUrl.includes("/storage/v1/object/public/")) {
    return imageUrl.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    ) + `?width=${width}&quality=75`;
  }
  return imageUrl;
}
