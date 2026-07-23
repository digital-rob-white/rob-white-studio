import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("The Studio backend is not configured yet. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in Netlify.");
  }
  client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}

export async function requireStudioUser(): Promise<{ client: SupabaseClient; user: User }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`/studio/login?returnTo=${encodeURIComponent(returnTo)}`);
    throw new Error("Authentication required");
  }
  await supabase.from("users").upsert({
    id: data.user.id,
    email: data.user.email || `${data.user.id}@studio.local`,
    display_name: data.user.user_metadata?.display_name || null
  }, { onConflict: "id", ignoreDuplicates: true });
  return { client: supabase, user: data.user };
}

export function setupStudioSignOut(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-studio-signout]");
  button?.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await getSupabase().auth.signOut();
    } finally {
      window.location.assign("/studio/login");
    }
  });
}

export function showStudioError(error: unknown, target = "[data-studio-error]"): void {
  const element = document.querySelector<HTMLElement>(target);
  if (!element) return;
  element.textContent = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  element.hidden = false;
}

export async function signedImageUrl(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}
