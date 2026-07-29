import { useState, useEffect } from "react";
import { api } from "./lib/api";
import { toast } from "sonner";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card";

export default function App() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/health")
      .then((data) => {
        if (data && data.user) setUser(data.user);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4 bg-background">
        <h1 className="text-xl font-bold">Camoburguer Ops</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">Operador: {user.username} ({user.role})</span>
          <Button variant="outline" onClick={() => {
            api("/auth/logout", { method: "POST" })
              .then(() => setUser(null))
              .catch((err) => toast.error(err.message));
          }}>
            Sair
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6">
        <Dashboard user={user} />
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(data.user);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Acesso Operacional</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">Entrar</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function Dashboard({ user }: { user: any }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo, {user.username}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sistema em construção (React/Vite Migration).</p>
        </CardContent>
      </Card>
    </div>
  );
}
