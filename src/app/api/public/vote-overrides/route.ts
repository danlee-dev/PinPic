import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

// Public endpoint that returns the minimum data needed for the Hall of Fame
// to render the displayed TOP 10. The underlying vote_overrides table is
// locked down with admin-only RLS so the raw `note` audit trail and the
// fact that overrides exist at all is hidden from clients. We use the
// service role on the server to bypass that lock and return only the two
// fields the client actually needs.
export async function GET() {
  const service = createServiceClient();
  const { data, error } = await service
    .from("vote_overrides")
    .select("photo_id, vote_offset");

  if (error) {
    console.error("Failed to load vote_overrides:", error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? [], {
    headers: {
      // Brief edge cache so a refresh storm does not slam the DB,
      // but short enough that admin updates land quickly.
      "Cache-Control": "public, max-age=10, s-maxage=10",
    },
  });
}
