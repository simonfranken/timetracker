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

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

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
  onCreated: (input: {
    targetHours: number;
    periodType: 'weekly' | 'monthly';
    workingDays: string[];
    startDate: string;
  }) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const { addCorrection, deleteCorrection, updateTarget } = useClientTargets();

  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  // Create/edit form state
  const [formHours, setFormHours] = useState('');
  const [formPeriodType, setFormPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [formWorkingDays, setFormWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [formStartDate, setFormStartDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // Correction form state
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [corrDate, setCorrDate] = useState('');
  const [corrDuration, setCorrDuration] = useState('');
  const [corrNegative, setCorrNegative] = useState(false);
  const [corrDesc, setCorrDesc] = useState('');
  const [corrError, setCorrError] = useState<string | null>(null);
  const [corrSaving, setCorrSaving] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];

  const openCreate = () => {
    setFormHours('');
    setFormPeriodType('weekly');
    setFormWorkingDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormStartDate(todayIso);
    setFormError(null);
    setEditing(false);
    setShowForm(true);
  };

  const openEdit = () => {
    if (!target) return;
    setFormHours(String(target.targetHours));
    setFormPeriodType(target.periodType);
    setFormWorkingDays([...target.workingDays]);
    setFormStartDate(target.startDate);
    setFormError(null);
    setEditing(true);
    setShowForm(true);
  };

  const toggleDay = (day: string) => {
    setFormWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const hours = parseFloat(formHours);
    if (isNaN(hours) || hours <= 0 || hours > 168) {
      setFormError(`${formPeriodType === 'weekly' ? 'Weekly' : 'Monthly'} hours must be between 0 and 168`);
      return;
    }
    if (formWorkingDays.length === 0) {
      setFormError('Select at least one working day');
      return;
    }
    if (!formStartDate) {
      setFormError('Please select a start date');
      return;
    }
    setFormSaving(true);
    try {
      if (editing && target) {
        await updateTarget.mutateAsync({
          id: target.id,
          input: {
            targetHours: hours,
            periodType: formPeriodType,
            workingDays: formWorkingDays,
            startDate: formStartDate,
          },
        });
      } else {
        await onCreated({
          targetHours: hours,
          periodType: formPeriodType,
          workingDays: formWorkingDays,
          startDate: formStartDate,
        });
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
    if (!corrDuration) {
      setCorrError('Enter a duration');
      return;
    }
    const [hPart, mPart] = corrDuration.split(':').map(Number);
    const h = isNaN(hPart) ? 0 : hPart;
    const m = isNaN(mPart) ? 0 : mPart;
    if (h === 0 && m === 0) {
      setCorrError('Duration must be at least 1 minute');
      return;
    }
    const totalHours = (h + m / 60) * (corrNegative ? -1 : 1);
    if (!corrDate) {
      setCorrError('Please select a date');
      return;
    }
    setCorrSaving(true);
    try {
      const input: CreateCorrectionInput = { date: corrDate, hours: totalHours, description: corrDesc || undefined };
      await addCorrection.mutateAsync({ targetId: target.id, input });
      setCorrDate('');
      setCorrDuration('');
      setCorrNegative(false);
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
          Set target
        </button>
      </div>
    );
  }

  if (showForm) {
    const hoursLabel = formPeriodType === 'weekly' ? 'Hours/week' : 'Hours/month';
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-700 mb-2">
          {editing ? 'Edit target' : 'Set target'}
        </p>
        <form onSubmit={handleFormSubmit} className="space-y-2">
          {formError && <p className="text-xs text-red-600">{formError}</p>}

          {/* Period type */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Period</label>
            <div className="flex gap-2">
              {(['weekly', 'monthly'] as const).map(pt => (
                <label key={pt} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="periodType"
                    value={pt}
                    checked={formPeriodType === pt}
                    onChange={() => setFormPeriodType(pt)}
                    className="accent-primary-600"
                  />
                  {pt.charAt(0).toUpperCase() + pt.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Hours + Start Date */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">{hoursLabel}</label>
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
              <label className="block text-xs text-gray-500 mb-0.5">Start date</label>
              <input
                type="date"
                value={formStartDate}
                onChange={e => setFormStartDate(e.target.value)}
                className="input text-sm py-1"
                required
              />
            </div>
          </div>

          {/* Working days */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Working days</label>
            <div className="flex gap-1 flex-wrap">
              {ALL_DAYS.map(day => {
                const active = formWorkingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                      active
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-primary-400'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                );
              })}
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
  const periodLabel = target!.periodType === 'weekly' ? 'week' : 'month';

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {/* Target summary row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-600">
            <span className="font-medium">{target!.targetHours}h</span>/{periodLabel}
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
                  {c.hours >= 0 ? '+' : '−'}{formatDurationHoursMinutes(Math.abs(c.hours) * 3600)}
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
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Duration</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCorrNegative(v => !v)}
                      className={`input text-xs py-1 px-2 font-mono font-bold w-8 shrink-0 text-center transition-colors ${
                        corrNegative
                          ? 'bg-red-50 border-red-300 text-red-600'
                          : 'bg-green-50 border-green-300 text-green-600'
                      }`}
                      title="Toggle positive / negative"
                    >
                      {corrNegative ? '−' : '+'}
                    </button>
                    <input
                      type="time"
                      value={corrDuration}
                      onChange={e => setCorrDuration(e.target.value)}
                      className="input text-xs py-1 flex-1 min-w-0"
                      required
                    />
                  </div>
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
                  onCreated={async ({ targetHours, periodType, workingDays, startDate }) => {
                    await createTarget.mutateAsync({
                      clientId: client.id,
                      targetHours,
                      periodType,
                      workingDays,
                      startDate,
                    });
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
