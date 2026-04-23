import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll();
        },
        async setAll(cookiesToSet) {
          try {
            const store = await cookieStore;
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options);
            }
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

/**
 * Authenticate from either cookies (web) or Bearer token (iOS).
 * Returns { user, supabase } where supabase is properly authenticated.
 */
export async function getAuthUser(request: NextRequest): Promise<{
  user: { id: string; email?: string } | null;
  supabase: SupabaseClient;
}> {
  // Check for Bearer token first (iOS app)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Verify the user's identity from their JWT
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await anonClient.auth.getUser(token);
    // Use service role client for DB operations — the API routes handle
    // their own authorization (ownership checks, rate limits), so we
    // bypass RLS. This avoids issues with the JS client overriding the
    // Bearer token header internally.
    const supabase = createSupabaseServiceClient();
    return { user, supabase };
  }

  // Fall back to cookie auth (web app)
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
