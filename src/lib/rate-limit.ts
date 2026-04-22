import { SupabaseClient } from "@supabase/supabase-js";

// Rate limits per action type (requests per hour)
const RATE_LIMITS: Record<string, number> = {
  search: 20,          // ArXiv searches (expensive — external API call)
  add_paper: 100,      // Adding papers to lists
  update_paper: 200,   // Updating paper notes/list/date
  delete_paper: 100,   // Removing papers
  create_tag: 100,     // Creating tags
  delete_tag: 100,     // Deleting tags
  tag_paper: 200,      // Adding/removing tags on papers
};

const DEFAULT_LIMIT = 100;

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: string = "search"
): Promise<{ allowed: boolean; remaining: number }> {
  const maxPerHour = RATE_LIMITS[action] ?? DEFAULT_LIMIT;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", oneHourAgo);

  const used = count || 0;
  const remaining = Math.max(0, maxPerHour - used);

  return { allowed: used < maxPerHour, remaining };
}

export async function recordAction(
  supabase: SupabaseClient,
  userId: string,
  action: string = "search"
): Promise<void> {
  await supabase.from("rate_limit_log").insert({
    user_id: userId,
    action,
  });
}

// Helper: check + record in one call, returns error response if rate limited
export async function enforceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: string
): Promise<{ limited: true; remaining: 0 } | { limited: false; remaining: number }> {
  const { allowed, remaining } = await checkRateLimit(supabase, userId, action);
  if (!allowed) {
    return { limited: true, remaining: 0 };
  }
  await recordAction(supabase, userId, action);
  return { limited: false, remaining };
}
