import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin
  const { data: admin } = await supabase.from("admins").select("id").eq("user_id", user.id).single();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const service = createServiceClient();

  // Get photo to find storage paths
  const { data: photo } = await service.from("photos").select("image_url, thumb_url").eq("id", id).single();
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  // Delete storage files
  const bucket = "photos";
  const paths: string[] = [];
  if (photo.image_url) {
    const match = photo.image_url.match(/\/photos\/(.+)$/);
    if (match) paths.push(match[1]);
  }
  if (photo.thumb_url) {
    const match = photo.thumb_url.match(/\/photos\/(.+)$/);
    if (match) paths.push(match[1]);
  }
  if (paths.length > 0) {
    await service.storage.from(bucket).remove(paths);
  }

  // Delete photo row (cascades votes)
  const { error } = await service.from("photos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
