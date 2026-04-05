import { PhotoPageClient } from "./client";

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PhotoPageClient id={id} />;
}
