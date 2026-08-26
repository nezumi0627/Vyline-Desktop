import { useState } from "react";
import { api } from "@/api/client";
import { useStore } from "@/lib/store";

function formatTime(value: number): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function LocalSearchSection() {
  const accountId = useStore((s) => s.accountId);
  const demoMode = useStore((s) => s.demoMode);
  const openChat = useStore((s) => s.openChat);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    NonNullable<Awaited<ReturnType<typeof api.line.searchMessages>>["results"]>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const trimmed = query.trim();
    if (!trimmed || !accountId || demoMode) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.line.searchMessages(accountId, trimmed);
      if (response.ok) setResults(response.results ?? []);
      else setError(response.error ?? "検索に失敗しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-base font-semibold">トーク横断検索</h2>
      <p className="mt-1 text-sm text-[var(--vy-text-dim)]">
        このアカウントのローカル履歴だけを検索します。
      </p>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="メッセージを検索"
          maxLength={200}
          disabled={!accountId || demoMode || busy}
          className="min-w-0 flex-1 rounded-xl border border-[var(--vy-border)] bg-[var(--vy-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--vy-accent)]"
        />
        <button
          type="submit"
          disabled={!query.trim() || !accountId || demoMode || busy}
          className="rounded-xl bg-[var(--vy-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "検索中…" : "検索"}
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <div className="mt-4 space-y-2">
        {results.map((result) => (
          <button
            key={`${result.chatMid}:${result.messageId}`}
            type="button"
            onClick={() => openChat(result.chatMid)}
            className="w-full rounded-xl border border-[var(--vy-border)] bg-[var(--vy-surface)] p-3 text-left transition-colors hover:bg-[var(--vy-surface-2)]"
          >
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--vy-text-dim)]">
              <span className="truncate font-medium text-[var(--vy-text)]">{result.chatName}</span>
              <span className="shrink-0">{formatTime(result.createdTime)}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--vy-text-dim)]">送信者: {result.senderMid}</p>
            <p className="mt-1 text-sm">{result.excerpt}</p>
          </button>
        ))}
        {!busy && query.trim() && results.length === 0 && !error && (
          <p className="py-4 text-sm text-[var(--vy-text-dim)]">該当するメッセージはありません。</p>
        )}
      </div>
    </section>
  );
}
