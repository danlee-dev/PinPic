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

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const service = createServiceClient();

  // Find user by email
  const { data: { users }, error: listError } = await service.auth.admin.listUsers();
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const target = users.find((u) => u.email === email);
  if (!target) return NextResponse.json({ error: "해당 이메일로 가입한 사용자가 없습니다. 먼저 로그인해야 합니다." }, { status: 404 });

  // Insert admin
  const { error } = await service.from("admins").insert({ user_id: target.id, email });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "이미 관리자입니다." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
