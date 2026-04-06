import { PhotoPageClient } from "./client";
import { createServiceClient } from "@/utils/supabase/service";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("nickname, school, image_url, thumb_url")
    .eq("id", id)
    .single();

  if (!photo) {
    return { title: "PinPic" };
  }

  const schoolName = photo.school === "yonsei" ? "연세대" : "고려대";
  const title = `${photo.nickname} (${schoolName}) - PinPic 사진 고연전`;
  const description = `${photo.nickname}님의 사진에 투표해주세요! 제1회 캠퍼스 사진 고연전`;
  const imageUrl = photo.thumb_url || photo.image_url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PhotoPageClient id={id} />;
}
