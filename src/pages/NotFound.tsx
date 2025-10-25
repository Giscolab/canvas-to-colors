// src/pages/NotFound.tsx
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Compass, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main
      role="main"
      aria-labelledby="nf-title"
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4"
    >
      <Card className="w-full max-w-xl bg-card/80 backdrop-blur border shadow-lg">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-amber-500/15 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 id="nf-title" className="text-xl font-semibold tracking-tight">
                Page introuvable
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Désolé, cette ressource n’existe pas (ou plus). Vérifie l’URL ou reviens à l’accueil.
              </p>
              <p className="mt-1 text-xs text-muted-foreground break-all">
                Route demandée : <code className="font-mono">{location.pathname}</code>
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild className="w-full gap-2">
              <Link to="/" aria-label="Revenir à l’accueil">
                <Home className="h-4 w-4" />
                Accueil
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full gap-2">
              <a
                href="https://github.com/Giscolab/canvas-to-colors"
                target="_blank"
                rel="noreferrer"
                aria-label="Ouvrir la documentation du projet"
              >
                <Compass className="h-4 w-4" />
                Docs / Repo
              </a>
            </Button>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            Code : <code className="font-mono">404</code> — Le reste du site reste accessible via la barre de navigation.
          </div>
        </div>
      </Card>
    </main>
  );
}
