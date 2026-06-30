import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useClientTargets } from '@/hooks/useClientTargets';
import { useProjects } from '@/hooks/useProjects';
import { clientTargetsApi } from '@/api/clientTargets';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Spinner } from '@/components/Spinner';
import { TargetProgressItem } from '@/components/TargetProgressItem';
import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  ClientTargetWithBalance,
} from '@/types';

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};
const CORRECTION_HOURS_MIN = -1000;
const CORRECTION_HOURS_MAX = 1000;

type TargetCorrectionForm = {
  id?: string;
  date: string;
  hours: string;
  description: string;
};

function parseCorrectionHours(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSignedHours(hours: number): string {
  if (hours === 0) return '±0h';

  const sign = hours > 0 ? '+' : '-';
  const absolute = Math.abs(hours);
  const formatted = Number.isInteger(absolute)
    ? String(absolute)
    : absolute.toFixed(2).replace(/\.?0+$/, '');

  return `${sign}${formatted}h`;
}

// Inline target panel shown inside each client card
function ClientTargetPanel({
  target,
}: {
  target: ClientTargetWithBalance | undefined;
}) {
  if (!target) {
    return (
      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>
        <p className="mt-1 text-sm text-slate-500">No target configured. Use Edit Client to set one.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <TargetProgressItem
        target={target}
        showClientName={false}
        heading="Target"
        containerClassName="rounded-xl bg-slate-50/70 p-3"
      />
    </div>
  );
}

export function ClientsPage() {
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients();
  const { targets, createTarget, updateTarget, deleteTarget, addCorrection, deleteCorrection } = useClientTargets();
  const { projects } = useProjects();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<CreateClientInput>({ name: '', description: '' });
  const [targetEnabled, setTargetEnabled] = useState(false);
  const [targetHours, setTargetHours] = useState('');
  const [targetPeriodType, setTargetPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [targetWorkingDays, setTargetWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [targetStartDate, setTargetStartDate] = useState('');
  const [targetCorrections, setTargetCorrections] = useState<TargetCorrectionForm[]>([]);
  const [isAddingCorrection, setIsAddingCorrection] = useState(false);
  const [newCorrection, setNewCorrection] = useState<TargetCorrectionForm>({
    date: '',
    hours: '',
    description: '',
  });
  const [confirmCorrection, setConfirmCorrection] = useState<{
    index: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayIso = new Date().toISOString().split('T')[0];

  const sortedTargetCorrections = targetCorrections
    .map((correction, index) => ({ correction, index }))
    .sort((a, b) => {
      const dateCompare = a.correction.date.localeCompare(b.correction.date);
      return dateCompare === 0 ? a.index - b.index : dateCompare;
    });

  const toggleTargetDay = (day: string) => {
    setTargetWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const addTargetCorrection = () => {
    setIsAddingCorrection(true);
    setNewCorrection({ date: targetStartDate || todayIso, hours: '', description: '' });
  };

  const removeTargetCorrection = (index: number) => {
    setTargetCorrections((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const promptDeleteTargetCorrection = (index: number, correction: TargetCorrectionForm) => {
    const parsedHours = parseCorrectionHours(correction.hours);
    const amount = parsedHours === null ? 'this' : `${formatSignedHours(parsedHours)}`;

    setConfirmCorrection({
      index,
      message: `Delete the ${amount} correction dated ${correction.date}? This change is saved only when you click Save Changes.`,
    });
  };

  const handleCorrectionDeleteConfirmed = () => {
    if (!confirmCorrection) return;
    removeTargetCorrection(confirmCorrection.index);
  };

  const validateTargetCorrection = (correction: TargetCorrectionForm, rowLabel: string): string | null => {
    if (!correction.date) {
      return `${rowLabel}: select a date`;
    }

    if (correction.date < targetStartDate) {
      return `${rowLabel}: date cannot be before the target start date`;
    }

    const parsedHours = parseCorrectionHours(correction.hours);
    if (parsedHours === null) {
      return `${rowLabel}: enter an amount`;
    }

    if (parsedHours < CORRECTION_HOURS_MIN || parsedHours > CORRECTION_HOURS_MAX) {
      return `${rowLabel}: amount must be between ${CORRECTION_HOURS_MIN} and ${CORRECTION_HOURS_MAX}`;
    }

    return null;
  };

  const saveNewCorrection = () => {
    const validationError = validateTargetCorrection(newCorrection, 'New correction');
    if (validationError) {
      setError(validationError);
      return;
    }

    setTargetCorrections((prev) => [...prev, newCorrection]);
    setNewCorrection({ date: '', hours: '', description: '' });
    setIsAddingCorrection(false);
    setError(null);
  };

  const cancelNewCorrection = () => {
    setNewCorrection({ date: '', hours: '', description: '' });
    setIsAddingCorrection(false);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ name: client.name, description: client.description || '' });
      const existingTarget = targets?.find((target) => target.clientId === client.id);
      if (existingTarget) {
        setTargetEnabled(true);
        setTargetHours(String(existingTarget.targetHours));
        setTargetPeriodType(existingTarget.periodType);
        setTargetWorkingDays([...existingTarget.workingDays]);
        setTargetStartDate(existingTarget.startDate);
        setTargetCorrections(
          existingTarget.corrections.map((correction) => ({
            id: correction.id,
            date: correction.date,
            hours: String(correction.hours),
            description: correction.description ?? '',
          })),
        );
      } else {
        setTargetEnabled(false);
        setTargetHours('');
        setTargetPeriodType('weekly');
        setTargetWorkingDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
        setTargetStartDate(todayIso);
        setTargetCorrections([]);
      }
    } else {
      setEditingClient(null);
      setFormData({ name: '', description: '' });
      setTargetEnabled(false);
      setTargetHours('');
      setTargetPeriodType('weekly');
      setTargetWorkingDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
      setTargetStartDate(todayIso);
      setTargetCorrections([]);
    }
    setIsAddingCorrection(false);
    setNewCorrection({ date: '', hours: '', description: '' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({ name: '', description: '' });
    setTargetEnabled(false);
    setTargetHours('');
    setTargetPeriodType('weekly');
    setTargetWorkingDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setTargetStartDate(todayIso);
    setTargetCorrections([]);
    setIsAddingCorrection(false);
    setNewCorrection({ date: '', hours: '', description: '' });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }

    if (targetEnabled) {
      const parsedHours = parseFloat(targetHours);
      if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 168) {
        setError(`${targetPeriodType === 'weekly' ? 'Weekly' : 'Monthly'} hours must be between 0 and 168`);
        return;
      }
      if (targetWorkingDays.length === 0) {
        setError('Select at least one working day for target');
        return;
      }
      if (!targetStartDate) {
        setError('Select a target start date');
        return;
      }
      if (isAddingCorrection) {
        setError('Add or cancel the new correction before saving');
        return;
      }
      for (let index = 0; index < targetCorrections.length; index++) {
        const correction = targetCorrections[index];
        const validationError = validateTargetCorrection(correction, `Correction ${index + 1}`);
        if (validationError) {
          setError(validationError);
          return;
        }
      }
    }

    try {
      let clientId: string;

      if (editingClient) {
        await updateClient.mutateAsync({
          id: editingClient.id,
          input: formData as UpdateClientInput,
        });
        clientId = editingClient.id;
      } else {
        const createdClient = await createClient.mutateAsync(formData);
        clientId = createdClient.id;
      }

      const existingTarget = targets?.find((target) => target.clientId === clientId);

      if (targetEnabled) {
        const payload = {
          targetHours: parseFloat(targetHours),
          periodType: targetPeriodType,
          workingDays: targetWorkingDays,
          startDate: targetStartDate,
        };

        if (existingTarget) {
          await updateTarget.mutateAsync({ id: existingTarget.id, input: payload });
        } else {
          await createTarget.mutateAsync({ clientId, ...payload });
        }

        const refreshTargets = await clientTargetsApi.getAll();
        const currentTarget = refreshTargets.find((target) => target.clientId === clientId);

        if (currentTarget) {
          const existingCorrectionsById = new Map(
            currentTarget.corrections.map((correction) => [correction.id, correction]),
          );

          for (const correction of targetCorrections) {
            const parsedHours = parseCorrectionHours(correction.hours);
            if (!correction.date || parsedHours === null) {
              continue;
            }

            const existing = correction.id ? existingCorrectionsById.get(correction.id) : undefined;

            if (!existing) {
              await addCorrection.mutateAsync({
                targetId: currentTarget.id,
                input: {
                  date: correction.date,
                  hours: parsedHours,
                  description: correction.description || undefined,
                },
              });
              continue;
            }

            const descriptionMatches = (existing.description ?? '') === correction.description;
            if (existing.date === correction.date && existing.hours === parsedHours && descriptionMatches) {
              existingCorrectionsById.delete(correction.id as string);
              continue;
            }

            await deleteCorrection.mutateAsync({ targetId: currentTarget.id, correctionId: existing.id });
            await addCorrection.mutateAsync({
              targetId: currentTarget.id,
              input: {
                date: correction.date,
                hours: parsedHours,
                description: correction.description || undefined,
              },
            });
            existingCorrectionsById.delete(correction.id as string);
          }

          for (const staleCorrection of existingCorrectionsById.values()) {
            await deleteCorrection.mutateAsync({ targetId: currentTarget.id, correctionId: staleCorrection.id });
          }
        }
      } else if (existingTarget) {
        await deleteTarget.mutateAsync(existingTarget.id);
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

  const projectCountByClient = (projects ?? []).reduce<Record<string, number>>((acc, project) => {
    acc[project.clientId] = (acc[project.clientId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
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

      {clients?.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">No clients yet</h3>
          <p className="mt-1 text-sm text-slate-600">
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
            const projectCount = projectCountByClient[client.id] ?? 0;

            return (
              <div key={client.id} className="card border-slate-200/90 bg-gradient-to-br from-white via-white to-indigo-50/40">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-slate-900">
                      {client.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="chip bg-indigo-50 text-indigo-700">{projectCount} {projectCount === 1 ? 'project' : 'projects'}</span>
                    </div>
                    {client.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {client.description}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleOpenModal(client)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmClient(client)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <ClientTargetPanel target={target} />
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal
          title={editingClient ? 'Edit Client' : 'Add Client'}
          onClose={handleCloseModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
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

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Target Settings</p>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={targetEnabled}
                    onChange={(event) => setTargetEnabled(event.target.checked)}
                    className="accent-indigo-600"
                  />
                  Enabled
                </label>
              </div>

              {targetEnabled ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Target Hours</label>
                      <input
                        type="number"
                        value={targetHours}
                        onChange={(event) => setTargetHours(event.target.value)}
                        className="input"
                        min="0.5"
                        max="168"
                        step="0.5"
                        placeholder="e.g. 40"
                      />
                    </div>
                    <div>
                      <label className="label">Start Date</label>
                      <input
                        type="date"
                        value={targetStartDate}
                        onChange={(event) => setTargetStartDate(event.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Period Type</label>
                    <div className="flex gap-2">
                      {(['weekly', 'monthly'] as const).map((periodType) => (
                        <button
                          key={periodType}
                          type="button"
                          onClick={() => setTargetPeriodType(periodType)}
                          className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                            targetPeriodType === periodType
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'
                          }`}
                        >
                          {periodType.charAt(0).toUpperCase() + periodType.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Working Days</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_DAYS.map((day) => {
                        const active = targetWorkingDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleTargetDay(day)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                              active
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'
                            }`}
                          >
                            {DAY_LABELS[day]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="label mb-0">Balance Corrections</label>
                      <button
                        type="button"
                        onClick={addTargetCorrection}
                        disabled={isAddingCorrection}
                        className={`text-xs font-semibold ${
                          isAddingCorrection
                            ? 'cursor-not-allowed text-slate-400'
                            : 'text-indigo-600 hover:text-indigo-700'
                        }`}
                      >
                        + Add
                      </button>
                    </div>

                    {targetCorrections.length === 0 && !isAddingCorrection ? (
                      <p className="text-sm text-slate-500">No corrections configured.</p>
                    ) : null}

                    {targetCorrections.length > 0 && (
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="grid grid-cols-[5.75rem_minmax(0,1fr)_4.25rem_1.5rem] items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <span>Date</span>
                          <span>Description</span>
                          <span className="text-right">Amount</span>
                          <span className="sr-only">Delete</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {sortedTargetCorrections.map(({ correction, index }) => {
                            const parsedHours = parseCorrectionHours(correction.hours);
                            const amountClass = parsedHours === null || parsedHours === 0
                              ? 'text-slate-500'
                              : parsedHours > 0
                                ? 'text-emerald-700'
                                : 'text-rose-700';
                            const description = correction.description.trim();

                            return (
                              <div
                                key={correction.id ?? `new-${index}`}
                                className="grid grid-cols-[5.75rem_minmax(0,1fr)_4.25rem_1.5rem] items-center gap-1.5 px-2 py-2 text-xs"
                              >
                                <span className="truncate font-medium text-slate-700">{correction.date}</span>
                                <span
                                  className={`min-w-0 truncate ${description ? 'text-slate-600' : 'italic text-slate-400'}`}
                                  title={description || 'No description'}
                                >
                                  {description || 'No description'}
                                </span>
                                <span className={`truncate text-right font-semibold ${amountClass}`}>
                                  {parsedHours === null ? '—' : formatSignedHours(parsedHours)}
                                </span>
                                    <button
                                      type="button"
                                      onClick={() => promptDeleteTargetCorrection(index, correction)}
                                      className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                      title="Remove correction"
                                      aria-label="Remove correction"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isAddingCorrection && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)_5rem]">
                          <input
                            type="date"
                            value={newCorrection.date}
                            min={targetStartDate || undefined}
                            onChange={(event) => setNewCorrection((prev) => ({ ...prev, date: event.target.value }))}
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            aria-label="New correction date"
                          />
                          <input
                            type="text"
                            value={newCorrection.description}
                            onChange={(event) => setNewCorrection((prev) => ({ ...prev, description: event.target.value }))}
                            className="min-w-0 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Description"
                            maxLength={255}
                            aria-label="New correction description"
                          />
                          <input
                            type="number"
                            value={newCorrection.hours}
                            onChange={(event) => setNewCorrection((prev) => ({ ...prev, hours: event.target.value }))}
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs font-semibold text-slate-700 transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            min={CORRECTION_HOURS_MIN}
                            max={CORRECTION_HOURS_MAX}
                            step="0.5"
                            placeholder="0"
                            aria-label="New correction amount"
                          />
                        </div>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] text-slate-500">
                            Positive amounts add balance credit; negative amounts create deductions.
                          </p>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelNewCorrection}
                              className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveNewCorrection}
                              className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No target will be set for this client.</p>
              )}
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

      {confirmCorrection && (
        <ConfirmModal
          title="Delete correction?"
          message={confirmCorrection.message}
          onConfirm={handleCorrectionDeleteConfirmed}
          onClose={() => setConfirmCorrection(null)}
        />
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
