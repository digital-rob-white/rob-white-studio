import { getSupabase, showStudioError } from "./supabase-client";

const form = document.querySelector<HTMLFormElement>("[data-login-form]");
const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

async function initLogin() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      window.location.replace("/studio/journal");
      return;
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form || !submit) return;
      const values = new FormData(form);
      const email = String(values.get("email") || "").trim();
      const password = String(values.get("password") || "");
      submit.disabled = true;
      submit.textContent = "Opening…";
      document.querySelector<HTMLElement>("[data-studio-error]")?.setAttribute("hidden", "");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showStudioError(error);
        submit.disabled = false;
        submit.textContent = "Open studio";
        return;
      }
      const requested = new URLSearchParams(window.location.search).get("returnTo");
      window.location.assign(requested?.startsWith("/studio/") ? requested : "/studio/journal");
    });
  } catch (error) {
    showStudioError(error);
    if (submit) submit.disabled = true;
  }
}

void initLogin();
