import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useStore } from "@/lib/store";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export function AccountStatusSection() {
  const accountId = useStore((s) => s.accountId);
  const demoMode = useStore((s) => s.demoMode);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof api.line.accountStatus>> | null>(
    null,
  );

  useEffect(() => {
    if (!accountId || demoMode) return;
    void api.line
      .accountStatus(accountId)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [accountId, demoMode]);

  return (
    <section>
      <h2 className="text-base font-semibold">アカウント状態</h2>
      <p className="mt-1 text-sm text-[var(--vy-text-dim)]">
        ログイン状態と、このアカウントの保存データ容量です。
      </p>
      {status?.ok ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--vy-border)] bg-[var(--vy-surface)] p-4">
            <p className="text-xs text-[var(--vy-text-dim)]">ログイン</p>
            <p className="mt-2 text-sm font-medium">
              {status.session.loggedIn ? "接続中" : "未接続"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--vy-border)] bg-[var(--vy-surface)] p-4">
            <p className="text-xs text-[var(--vy-text-dim)]">保存セッション</p>
            <p className="mt-2 text-sm font-medium">
              {status.session.saved ? "保存済み" : "未保存"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--vy-border)] bg-[var(--vy-surface)] p-4">
            <p className="text-xs text-[var(--vy-text-dim)]">アカウントデータ</p>
            <p className="mt-2 text-sm font-medium">{formatBytes(status.dataBytes)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-[var(--vy-text-dim)]">
          アカウントにログインすると表示されます。
        </p>
      )}
    </section>
  );
}
