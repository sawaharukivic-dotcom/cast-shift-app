import { useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { PasswordGate, isAuthenticated } from "./components/PasswordGate";
import "./index.css";

// ?reset でlocalStorageをクリアしてリロード
if (new URLSearchParams(window.location.search).has("reset")) {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = window.location.pathname;
}

const App = lazy(() => import("./App.tsx"));

function Root() {
  const [authed, setAuthed] = useState(() => isAuthenticated());

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">読み込み中...</div>}>
      <App />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
