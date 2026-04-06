import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("admins").select("id").eq("user_id", user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userIds } = await req.json();
  if (!userIds || !Array.isArray(userIds)) return NextResponse.json({ error: "Missing userIds" }, { status: 400 });

  const service = createServiceClient();
  const emailMap: Record<string, string> = {};
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data: { users }, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const u of users) {
      if (userIds.includes(u.id)) {
        emailMap[u.id] = u.email || u.id.slice(0, 8) + "...";
      }
    }
    if (users.length < perPage || Object.keys(emailMap).length === userIds.length) break;
    page++;
  }

  return NextResponse.json(emailMap);
}
