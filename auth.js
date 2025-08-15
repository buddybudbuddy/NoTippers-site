// auth.js
// Centralized Supabase auth helpers for NoTippers
// - Toggles "Log In" / "Log Out" links automatically
// - Exposes NotippersAuth.requireAuth() to protect pages
// - Keeps ?next= intent and redirects after magic-link login

(() => {
  // --- CONFIG ---
  const SUPABASE_URL = "https://sruwewdifhinkviqibjv.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydXdld2RpZmhpbmt2aXFpYmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMTM1NzIsImV4cCI6MjA3MDc4OTU3Mn0.p2UHsx4ejit75hoBKt7XeoaQIL6NEhzNDv-N0IBib-s";

  // --- GUARDS ---
  if (!window.supabase) {
    console.error("Supabase JS not loaded. Include @supabase/supabase-js before auth.js");
    return;
  }

  // --- CLIENT ---
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- DOM REFS (optional if not present on a page) ---
  const loginLink  = document.getElementById("loginLink");
  const logoutLink = document.getElementById("logoutLink");

  // Toggle header links based on session
  async function updateHeaderAuthState() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        if (loginLink)  loginLink.style.display  = "none";
        if (logoutLink) logoutLink.style.display = "inline-block";
      } else {
        if (loginLink)  loginLink.style.display  = "inline-block";
        if (logoutLink) logoutLink.style.display = "none";
      }
    } catch (e) {
      // fail silently in UI, but log for debugging
      console.debug("updateHeaderAuthState error:", e);
    }
  }

  // Keep header in sync when auth state changes anywhere
  sb.auth.onAuthStateChange((_event, _session) => {
    updateHeaderAuthState();
  });

  // Logout click (if present)
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await sb.auth.signOut();
      } finally {
        // After logout, send them to login (keeps flow simple)
        window.location.href = "login.html";
      }
    });
  }

  // Preserve ?next= intent globally (only sets if present)
  (function rememberNextParam() {
    const url = new URL(window.location.href);
    const next = url.searchParams.get("next");
    if (next) {
      localStorage.setItem("auth_next", next);
    }
  })();

  // Expose a tiny API
  const NotippersAuth = {
    /** Resolves when header state is first synced */
    ready: (async () => {
      await updateHeaderAuthState();
      return true;
    })(),

    /** The Supabase client (use if you need it) */
    client: sb,

    /** Get current session quickly */
    getSession: async () => {
      const { data: { session } } = await sb.auth.getSession();
      return session;
    },

    /** Require login for a page. If not logged in, redirect to login with ?next= */
    requireAuth: async (redirectIfMissing = true) => {
      const { data: { session } } = await sb.auth.getSession();
      if (session) return session;

      if (redirectIfMissing) {
        const next = encodeURIComponent(window.location.pathname);
        window.location.href = `login.html?next=${next}`;
      }
      return null;
    },

    /** After successful auth-complete, send them back where they intended */
    redirectAfterAuth: () => {
      const next = localStorage.getItem("auth_next") || "/report.html";
      window.location.href = next;
    }
  };

  // Make it global
  window.NotippersAuth = NotippersAuth;
})();