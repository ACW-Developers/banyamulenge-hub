import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (user: User) => {
    const userId = user.id;
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, location")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    let effective = prof as Profile | null;
    // Auto-create a profile row on first sign-in so the account is visible
    // across the app (feed, messages, admin users, etc).
    if (!effective) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const emailBase = user.email?.split("@")[0] ?? `user_${userId.slice(0, 8)}`;
      const raw = ((meta.username as string | undefined) ?? emailBase).toLowerCase();
      let username = raw.replace(/[^a-z0-9_]/g, "") || `user_${userId.slice(0, 8)}`;
      // Resolve unique username collisions with a numeric suffix.
      for (let i = 0; i < 20; i++) {
        const { data: clash } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();
        if (!clash) break;
        username = `${raw}${i + 1}`;
      }
      const insert = {
        id: userId,
        username,
        display_name:
          (meta.display_name as string | undefined) ||
          (meta.full_name as string | undefined) ||
          username,
        avatar_url: (meta.avatar_url as string | undefined) ?? null,
      };
      const { data: created } = await supabase
        .from("profiles")
        .insert(insert)
        .select("id, username, display_name, bio, avatar_url, location")
        .maybeSingle();
      effective = (created as Profile | null) ?? (insert as unknown as Profile);
    }

    setProfile(effective);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin,
    loading,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user);
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
