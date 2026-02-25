import { useState } from "react";

export function DebugTextDisplay({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  if (!text) return null;

  return (
    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="text-yellow-800 hover:text-yellow-900 underline"
      >
        {show ? "テキスト化結果を隠す" : "テキスト化結果を表示"}
      </button>
      {show && (
        <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-auto max-h-40">
          {text}
        </pre>
      )}
    </div>
  );
}
