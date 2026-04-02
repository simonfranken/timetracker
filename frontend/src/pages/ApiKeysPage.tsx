import { useState } from "react";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { CreatedApiKey } from "@/types";

export function ApiKeysPage() {
  const { apiKeys, isLoading, error, createApiKey, deleteApiKey } = useApiKeys();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreateError(null);
    try {
      const key = await createApiKey.mutateAsync({ name: newKeyName.trim() });
      setCreatedKey(key);
      setNewKeyName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleCopyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.rawKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
    setCreatedKey(null);
    setNewKeyName("");
    setCreateError(null);
    setCopiedKey(false);
  }

  async function handleRevoke(id: string) {
    try {
      await deleteApiKey.mutateAsync(id);
      setRevokeConfirmId(null);
    } catch (_err) {
      // error rendered below the table row via deleteApiKey.error
    }
  }

  return (
    <div className="space-y-6 py-2">
      <div className="page-header sm:flex-nowrap">
        <div className="max-w-3xl">
          <h1 className="page-title">API Keys</h1>
          <p className="page-subtitle">
            API keys allow agents and external tools to authenticate with the TimeTracker API and MCP endpoint.
            The raw key is only shown once at creation time — store it securely.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load API keys"}
        </div>
      )}

      {deleteApiKey.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {deleteApiKey.error instanceof Error
            ? deleteApiKey.error.message
            : "Failed to revoke API key"}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading...</div>
      ) : !apiKeys || apiKeys.length === 0 ? (
        <div className="card border-dashed py-12 text-center">
          <Key className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="table-shell">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Prefix</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Used</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900">{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                      {key.prefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(key.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(key.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {revokeConfirmId === key.id ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs text-red-600">Revoke?</span>
                        <button
                          onClick={() => handleRevoke(key.id)}
                          disabled={deleteApiKey.isPending}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setRevokeConfirmId(null)}
                          className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                        <button
                          onClick={() => setRevokeConfirmId(key.id)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                          title="Revoke key"
                        >
                        <Trash2 className="h-4 w-4" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl shadow-slate-900/20">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create API Key</h2>
            </div>

            <div className="px-6 py-5">
              {createdKey ? (
                /* One-time key reveal */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Copy this key now. <strong>It will not be shown again.</strong>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Your new API key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 break-all rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-xs text-slate-900">
                        {createdKey.rawKey}
                      </code>
                      <button
                        onClick={handleCopyKey}
                        className="flex-shrink-0 rounded-lg border border-slate-300 p-2 transition-colors hover:bg-slate-50"
                        title="Copy to clipboard"
                      >
                        {copiedKey ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Name input form */
                <div className="space-y-4">
                  <div>
                    <label htmlFor="key-name" className="mb-1 block text-sm font-medium text-slate-700">
                      Key name
                    </label>
                    <input
                      id="key-name"
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="e.g. My Claude Agent"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                  {createError && (
                    <p className="text-red-600 text-sm">{createError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={handleCloseCreateModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
              >
                {createdKey ? "Done" : "Cancel"}
              </button>
              {!createdKey && (
                <button
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || createApiKey.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createApiKey.isPending ? "Creating..." : "Create"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
