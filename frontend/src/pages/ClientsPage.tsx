import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import type { Client, CreateClientInput, UpdateClientInput } from '@/types';

export function ClientsPage() {
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<CreateClientInput>({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ name: client.name, description: client.description || '' });
    } else {
      setEditingClient(null);
      setFormData({ name: '', description: '' });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({ name: '', description: '' });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }

    try {
      if (editingClient) {
        await updateClient.mutateAsync({
          id: editingClient.id,
          input: formData as UpdateClientInput,
        });
      } else {
        await createClient.mutateAsync(formData);
      }
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete "${client.name}"? This will also delete all associated projects and time entries.`)) {
      return;
    }

    try {
      await deleteClient.mutateAsync(client.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your clients and customers
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Client
        </button>
      </div>

      {/* Clients List */}
      {clients?.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No clients yet</h3>
          <p className="mt-1 text-sm text-gray-600">
            Get started by adding your first client
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary mt-4"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Client
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients?.map((client) => (
            <div key={client.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {client.name}
                  </h3>
                  {client.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {client.description}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleOpenModal(client)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <Modal
          title={editingClient ? 'Edit Client' : 'Add Client'}
          onClose={handleCloseModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Client Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Enter client name"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Enter description"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createClient.isPending || updateClient.isPending}
              >
                {createClient.isPending || updateClient.isPending
                  ? 'Saving...'
                  : editingClient
                  ? 'Save Changes'
                  : 'Add Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}