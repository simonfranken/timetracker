import { useState } from "react";
import { format, isToday } from "date-fns";
import { Check, Copy } from "lucide-react";
import { useApiKeys } from "@/hooks/useApiKeys";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Spinner } from "@/components/Spinner";
import type { ApiKey, CreatedApiKey } from "@/types";

function lastUsedLabel(value: string | null): string {
  if (!value) return "Never used";
  const date = new Date(value);
  return isToday(date)
    ? `Last used today, ${format(date, "HH:mm")}`
    : `Last used ${format(date, "d MMM yyyy, HH:mm")}`;
}

export function ApiKeysPage() {
  const { apiKeys, isLoading, error, createApiKey, deleteApiKey } = useApiKeys();

  const [name, setName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setCreateError("Give the key a name first.");
      return;
    }
    setCreateError(null);
    try {
      const key = await createApiKey.mutateAsync({ name: name.trim() });
      setCreatedKey(key);
      setCopied(false);
      setName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCreateError("Could not copy automatically. Select the key and copy it manually.");
    }
  };

  const handleRevoke = async () => {
    if (!revokeKey) return;
    setRevokeError(null);
    try {
      await deleteApiKey.mutateAsync(revokeKey.id);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  return (
    <div className="flex max-w-[880px] flex-col gap-5">
      <header>
        <h1 className="page-title m-0">API keys</h1>
        <p className="page-subtitle">
          Let external tools and AI agents (MCP) read and write your time data. Keys are hashed on our
          side, so you only see a key once.
        </p>
      </header>

      <section className="card px-5 py-[22px] sm:px-[26px]">
        <h2 className="m-0 mb-3 text-[17px] font-bold">Create a key</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2.5" noValidate>
          <label htmlFor="key-name" className="sr-only">
            Key name
          </label>
          <input
            id="key-name"
            className="input min-w-[200px] flex-[1_1_280px]"
            placeholder="Name it after where it will be used, e.g. Claude Desktop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
          />
          <button type="submit" className="btn-primary" disabled={createApiKey.isPending}>
            {createApiKey.isPending ? "Generating…" : "Generate key"}
          </button>
        </form>
        {createError && (
          <div className="callout-error mt-3" role="alert">
            {createError}
          </div>
        )}
      </section>

      {createdKey && (
        <section
          className="card border-primary-400 bg-primary-50 px-5 py-[18px] sm:px-[26px]"
          role="status"
        >
          <b className="text-[15px]">Copy your new key now. It won't be shown again.</b>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <code className="min-w-0 flex-[1_1_300px] break-all rounded-[10px] border border-primary-300 bg-white px-3.5 py-3 text-sm">
              {createdKey.rawKey}
            </code>
            <button type="button" className="btn" onClick={() => void handleCopy()}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" className="btn" onClick={() => setCreatedKey(null)}>
              Done
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="callout-error" role="alert">
          {error instanceof Error ? error.message : "Failed to load API keys"}
        </div>
      )}
      {revokeError && (
        <div className="callout-error" role="alert">
          {revokeError}
        </div>
      )}

      <section className="card px-5 py-2 sm:px-[26px]">
        {isLoading ? (
          <Spinner />
        ) : !apiKeys || apiKeys.length === 0 ? (
          <p className="py-5 text-[15px] text-ink-muted">
            No API keys yet. Create one above to connect an external tool.
          </p>
        ) : (
          apiKeys.map((key, index) => (
            <div
              key={key.id}
              className={`flex flex-wrap items-center gap-3.5 py-4 ${index > 0 ? "row-divider" : ""}`}
            >
              <div className="min-w-[200px] flex-[1_1_220px]">
                <b>{key.name}</b>
                <div className="mt-0.5 text-[13px] text-ink-muted">
                  Starts with <code>{key.prefix}</code> · created{" "}
                  {format(new Date(key.createdAt), "d MMM yyyy")}
                </div>
              </div>
              <span className="text-[13px] text-ink-muted">{lastUsedLabel(key.lastUsedAt)}</span>
              <button
                type="button"
                className="btn btn-sm text-danger"
                onClick={() => setRevokeKey(key)}
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </section>

      {revokeKey && (
        <ConfirmModal
          title={`Revoke ${revokeKey.name}?`}
          message="Anything using this key stops working immediately. This can't be undone."
          confirmLabel="Revoke"
          onConfirm={() => void handleRevoke()}
          onClose={() => setRevokeKey(null)}
        />
      )}
    </div>
  );
}
