import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      toast.success("Connexion réussie !", {
        description: `Bienvenue ${email}`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de connexion";
      toast.error("Échec de connexion", { description: message });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
      
      toast.success("Compte créé !", {
        description: "Vous pouvez maintenant vous connecter"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur d'inscription";
      toast.error("Échec d'inscription", { description: message });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Déconnexion réussie");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de déconnexion";
      toast.error("Échec de déconnexion", { description: message });
      throw error;
    }
  };

  return { user, session, loading, signIn, signUp, signOut };
}
