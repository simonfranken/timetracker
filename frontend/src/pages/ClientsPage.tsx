import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, Target, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useClientTargets } from '@/hooks/useClientTargets';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Spinner } from '@/components/Spinner';
import { formatDurationHoursMinutes } from '@/utils/dateUtils';
import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  ClientTargetWithBalance,
  CreateCorrectionInput,
} from '@/types';

// Convert a <input type="week"> value like "2026-W07" to the Monday date "2026-02-16"
function weekInputToMonday(weekValue: string): string {
  const [yearStr, weekStr] = weekValue.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  // ISO week 1 is the week containing the first Thursday of January
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  return monday.toISOString().split('T')[0];
}

// Convert a YYYY-MM-DD Monday to "YYYY-Www" for the week input
function mondayToWeekInput(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  // ISO week number calculation
  const jan4 = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const diff = date.getTime() - firstMonday.getTime();
  const week = Math.floor(diff / (7 * 24 * 3600 * 1000)) + 1;
  // Handle year boundary: if week > 52 we might be in week 1 of next year
  const year = date.getUTCFullYear();
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function balanceLabel(seconds: number): { text: string; color: string } {
  if (seconds === 0) return { text: '±0', color: 'text-gray-500' };
  const abs = Math.abs(seconds);
  const text = (seconds > 0 ? '+' : '−') + formatDurationHoursMinutes(abs);
  const color = seconds > 0 ? 'text-green-600' : 'text-red-600';
  return { text, color };
}

// Inline target panel shown inside each client card
function ClientTargetPanel({
  target,
  onCreated,
  onDeleted,
}: {
  client: Client;
  target: ClientTargetWithBalance | undefined;
  onCreated: (weeklyHours: number, startDate: string) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const { addCorrection, deleteCorrection, updateTarget } = useClientTargets();

  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  // Create/edit form state
  const [formHours, setFormHours] = useState('');
  const [formWeek, setFormWeek] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // Correction form state
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [corrDate, setCorrDate] = useState('');
  const [corrHours, setCorrHours] = useState('');
  const [corrDesc, setCorrDesc] = useState('');
  const [corrError, setCorrError] = useState<string | null>(null);
  const [corrSaving, setCorrSaving] = useState(false);

  const openCreate = () => {
    setFormHours('');
    const today = new Date();
    const day = today.getUTCDay() || 7;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - day + 1);
    setFormWeek(mondayToWeekInput(monday.toISOString().split('T')[0]));
    setFormError(null);
    setEditing(false);
    setShowForm(true);
  };

  const openEdit = () => {
    if (!target) return;
    setFormHours(String(target.weeklyHours));
    setFormWeek(mondayToWeekInput(target.startDate));
    setFormError(null);
    setEditing(true);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const hours = parseFloat(formHours);
    if (isNaN(hours) || hours <= 0 || hours > 168) {
      setFormError('Weekly hours must be between 0 and 168');
      return;
    }
    if (!formWeek) {
      setFormError('Please select a start week');
      return;
    }
    const startDate = weekInputToMonday(formWeek);
    setFormSaving(true);
    try {
      if (editing && target) {
        await updateTarget.mutateAsync({ id: target.id, input: { weeklyHours: hours, startDate } });
      } else {
        await onCreated(hours, startDate);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setFormSaving(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleAddCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrError(null);
    if (!target) return;
    const hours = parseFloat(corrHours);
    if (isNaN(hours) || hours < -1000 || hours > 1000) {
      setCorrError('Hours must be between -1000 and 1000');
      return;
    }
    if (!corrDate) {
      setCorrError('Please select a date');
      return;
    }
    setCorrSaving(true);
    try {
      const input: CreateCorrectionInput = { date: corrDate, hours, description: corrDesc || undefined };
      await addCorrection.mutateAsync({ targetId: target.id, input });
      setCorrDate('');
      setCorrHours('');
      setCorrDesc('');
      setShowCorrectionForm(false);
    } catch (err) {
      setCorrError(err instanceof Error ? err.message : 'Failed to add correction');
    } finally {
      setCorrSaving(false);
    }
  };

  const handleDeleteCorrection = async (correctionId: string) => {
    if (!target) return;
    try {
      await deleteCorrection.mutateAsync({ targetId: target.id, correctionId });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete correction');
    }
  };

  if (!target && !showForm) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          <Target className="h-3.5 w-3.5" />
          Set weekly target
        </button>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-700 mb-2">
          {editing ? 'Edit target' : 'Set weekly target'}
        </p>
        <form onSubmit={handleFormSubmit} className="space-y-2">
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">Hours/week</label>
              <input
                type="number"
                value={formHours}
                onChange={e => setFormHours(e.target.value)}
                className="input text-sm py-1"
                placeholder="e.g. 40"
                min="0.5"
                max="168"
                step="0.5"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">Starting week</label>
              <input
                type="week"
                value={formWeek}
                onChange={e => setFormWeek(e.target.value)}
                className="input text-sm py-1"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary text-xs py-1 px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSaving}
              className="btn-primary text-xs py-1 px-3"
            >
              {formSaving ? 'Saving...' : editing ? 'Save' : 'Set target'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Target exists — show summary + expandable details
  const balance = balanceLabel(target!.totalBalanceSeconds);

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {/* Target summary row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-600">
            <span className="font-medium">{target!.weeklyHours}h</span>/week
          </span>
          <span className={`text-xs font-semibold ${balance.color}`}>{balance.text}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openEdit}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Edit target"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
            title="Delete target"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Show corrections"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded: corrections list + add form */}
      {expanded && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Corrections</p>

          {target!.corrections.length === 0 && !showCorrectionForm && (
            <p className="text-xs text-gray-400">No corrections yet</p>
          )}

          {target!.corrections.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
              <div className="text-xs text-gray-700">
                <span className="font-medium">{c.date}</span>
                {c.description && <span className="text-gray-500 ml-1">— {c.description}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${c.hours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {c.hours >= 0 ? '+' : ''}{c.hours}h
                </span>
                <button
                  onClick={() => handleDeleteCorrection(c.id)}
                  className="text-gray-300 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {showCorrectionForm ? (
            <form onSubmit={handleAddCorrection} className="space-y-1.5 pt-1">
              {corrError && <p className="text-xs text-red-600">{corrError}</p>}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Date</label>
                  <input
                    type="date"
                    value={corrDate}
                    onChange={e => setCorrDate(e.target.value)}
                    className="input text-xs py-1"
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-0.5">Hours</label>
                  <input
                    type="number"
                    value={corrHours}
                    onChange={e => setCorrHours(e.target.value)}
                    className="input text-xs py-1"
                    placeholder="+8 / -4"
                    step="0.5"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Description (optional)</label>
                <input
                  type="text"
                  value={corrDesc}
                  onChange={e => setCorrDesc(e.target.value)}
                  className="input text-xs py-1"
                  placeholder="e.g. Public holiday"
                  maxLength={255}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCorrectionForm(false)}
                  className="btn-secondary text-xs py-1 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={corrSaving}
                  className="btn-primary text-xs py-1 px-3"
                >
                  {corrSaving ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCorrectionForm(true)}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium pt-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add correction
            </button>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Target"
          message="Delete this target? All corrections will also be deleted."
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

export function ClientsPage() {
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients();
  const { targets, createTarget, deleteTarget } = useClientTargets();

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

  const [confirmClient, setConfirmClient] = useState<Client | null>(null);

  const handleDeleteConfirmed = async () => {
    if (!confirmClient) return;
    try {
      await deleteClient.mutateAsync(confirmClient.id);
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
          {clients?.map((client) => {
            const target = targets?.find(t => t.clientId === client.id);
            return (
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
                      onClick={() => setConfirmClient(client)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <ClientTargetPanel
                  client={client}
                  target={target}
                  onCreated={async (weeklyHours, startDate) => {
                    await createTarget.mutateAsync({ clientId: client.id, weeklyHours, startDate });
                  }}
                  onDeleted={async () => {
                    if (target) await deleteTarget.mutateAsync(target.id);
                  }}
                />
              </div>
            );
          })}
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

      {confirmClient && (
        <ConfirmModal
          title={`Delete "${confirmClient.name}"`}
          message="This will also delete all associated projects and time entries. This action cannot be undone."
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmClient(null)}
        />
      )}
    </div>
  );
}
