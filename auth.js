// auth.js
// Centralized Supabase auth helpers for NoTippers
// - Toggles "Log In" / "Log Out" links automatically
// - Exposes NotippersAuth.requireAuth() to protect pages
// - Preserves ?next= intent and supports redirect after magic-link login

(() => {
  // --- CONFIG ---
  const SUPABASE_URL = "https://gnkraxolcyrxpojrsolh.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_ZaE1ZrItKj1UG3icsjRNgw_ie-lbZnj";

  if (!window.supabase) {
    console.error("Supabase JS not loaded. Include @supabase/supabase-js before auth.js");
    return;
  }

  // Use explicit auth options so behavior is consistent across pages
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Optional header links (some pages may not have these)
  const loginLink = document.getElementById("loginLink");
  const logoutLink = document.getElementById("logoutLink");

  async function updateHeaderAuthState() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      const loggedIn = !!session;

      if (loginLink) loginLink.style.display = loggedIn ? "none" : "inline-block";
      if (logoutLink) logoutLink.style.display = loggedIn ? "inline-block" : "none";
    } catch (e) {
      // UI should not break if this fails
      console.debug("updateHeaderAuthState error:", e);
    }
  }

  // Keep header in sync when auth state changes
  sb.auth.onAuthStateChange(() => {
    updateHeaderAuthState();
  });

  // Logout click handler (if present)
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await sb.auth.signOut();
      } finally {
        // Send to login for a clean flow
        window.location.href = "login.html";
      }
    });
  }

  // If a page was opened with ?next=..., store it (so auth-complete can redirect back)
  (function rememberNextParam() {
    try {
      const url = new URL(window.location.href);
      const next = url.searchParams.get("next");
      if (next) localStorage.setItem("auth_next", next);
    } catch {}
  })();

  const NotippersAuth = {
    client: sb,

    ready: (async () => {
      await updateHeaderAuthState();
      return true;
    })(),

    getSession: async () => {
      const { data: { session } } = await sb.auth.getSession();
      return session;
    },

    // Require login for a page. If not logged in, redirect to login with ?next=
    requireAuth: async (redirectIfMissing = true) => {
      const { data: { session } } = await sb.auth.getSession();
      if (session) return session;

      if (redirectIfMissing) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?next=${next}`;
      }
      return null;
    },

    // After successful auth-complete, send them back where they intended
    redirectAfterAuth: () => {
      const next = localStorage.getItem("auth_next") || "/report.html";
      window.location.href = next;
    }
  };

  window.NotippersAuth = NotippersAuth;
})();