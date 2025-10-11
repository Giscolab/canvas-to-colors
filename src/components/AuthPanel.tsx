import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, LogOut, Mail, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function AuthPanel() {
  const { user, signIn, signUp, signOut, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        setIsSignUp(false); // Basculer vers login après inscription
      } else {
        await signIn(email, password);
      }
      setEmail("");
      setPassword("");
    } catch (error) {
      // Erreur déjà gérée dans useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border shadow-sm">
        <div className="text-sm text-muted-foreground">Chargement...</div>
      </Card>
    );
  }

  if (user) {
    return (
      <Card className="p-4 bg-card border shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Compte</h3>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Connecté en tant que</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
          
          <Button 
            onClick={signOut} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">
            {isSignUp ? "Créer un compte" : "Connexion"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>
            {isSignUp && (
              <p className="text-[10px] text-muted-foreground">
                Minimum 6 caractères
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="sm"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? "..." 
              : isSignUp 
                ? "Créer mon compte" 
                : "Se connecter"
            }
          </Button>
        </form>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setIsSignUp(!isSignUp)}
          disabled={isSubmitting}
        >
          {isSignUp 
            ? "Déjà un compte ? Se connecter" 
            : "Pas de compte ? S'inscrire"
          }
        </Button>
      </div>
    </Card>
  );
}
