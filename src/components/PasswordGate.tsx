import { useState, type FormEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const SESSION_KEY = "app-authenticated";
const EXPECTED_HASH =
  "7f166261f3d7cd61a61d25d1b0a394bddb673c51ac5e24775e279fe5285cdeb8";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const hash = await sha256(password);
    if (hash === EXPECTED_HASH) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-lg">
            スケジュール画像作成
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="gate-password" className="sr-only">パスワード</label>
            <Input
              id="gate-password"
              name="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">
                パスワードが正しくありません
              </p>
            )}
            <Button type="submit">ログイン</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
