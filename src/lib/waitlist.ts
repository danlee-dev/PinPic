import { createClient } from "@/utils/supabase/client";

export type WaitlistProduct = "top10_book";

export interface WaitlistJoinResult {
  success: boolean;
  position?: number;
  alreadyJoined?: boolean;
  error?: string;
}

export async function joinWaitlist(
  email: string,
  product_id: WaitlistProduct = "top10_book",
  source?: string
): Promise<WaitlistJoinResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { success: false, error: "올바른 이메일을 입력해주세요" };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("waitlist").insert({
    email: trimmed,
    user_id: user?.id ?? null,
    product_id,
    source: source ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      // Duplicate email — still surface their (existing) position
      const position = await fetchPosition(trimmed, product_id);
      return { success: true, position, alreadyJoined: true };
    }
    console.error("Failed to join waitlist:", error);
    return { success: false, error: "신청에 실패했습니다. 잠시 후 다시 시도해주세요" };
  }

  const position = await fetchPosition(trimmed, product_id);
  return { success: true, position };
}

async function fetchPosition(email: string, product_id: WaitlistProduct): Promise<number | undefined> {
  const supabase = createClient();
  // Position = how many entries exist for this product including this user
  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true })
    .eq("product_id", product_id);

  return count ?? undefined;
}
