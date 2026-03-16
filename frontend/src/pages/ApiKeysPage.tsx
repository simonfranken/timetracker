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
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Key className="h-6 w-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        API keys allow agents and external tools to authenticate with the TimeTracker API and MCP endpoint.
        The raw key is only shown once at creation time — store it securely.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error instanceof Error ? error.message : "Failed to load API keys"}
        </div>
      )}

      {deleteApiKey.isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {deleteApiKey.error instanceof Error
            ? deleteApiKey.error.message
            : "Failed to revoke API key"}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : !apiKeys || apiKeys.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <Key className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prefix</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Last Used</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                      {key.prefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(key.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(key.lastUsedAt)}</td>
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
                          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevokeConfirmId(key.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create API Key</h2>
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
                      <code className="flex-1 text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-900 break-all">
                        {createdKey.rawKey}
                      </code>
                      <button
                        onClick={handleCopyKey}
                        className="flex-shrink-0 p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Name input form */
                <div className="space-y-4">
                  <div>
                    <label htmlFor="key-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Key name
                    </label>
                    <input
                      id="key-name"
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="e.g. My Claude Agent"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  {createError && (
                    <p className="text-red-600 text-sm">{createError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseCreateModal}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {createdKey ? "Done" : "Cancel"}
              </button>
              {!createdKey && (
                <button
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || createApiKey.isPending}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
