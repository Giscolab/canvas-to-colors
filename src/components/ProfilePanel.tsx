import { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

export function ProfilePanel() {
  const { profile, loading, updateProfile } = useUserProfile();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Chargement du profil...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Aucun utilisateur connecté.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    const updates: any = {};
    if (username !== profile.username) updates.username = username;
    if (avatarUrl !== profile.avatar_url) updates.avatar_url = avatarUrl;
    
    if (Object.keys(updates).length > 0) {
      updateProfile(updates);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profil utilisateur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback>
              {profile.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Membre depuis {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              defaultValue={profile.username || ""}
              placeholder="Votre nom d'utilisateur"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar (URL)</Label>
            <Input
              id="avatar"
              defaultValue={profile.avatar_url || ""}
              placeholder="https://exemple.com/avatar.jpg"
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Sauvegarder les modifications
        </Button>
      </CardContent>
    </Card>
  );
}
