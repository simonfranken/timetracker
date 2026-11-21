import { useState } from "react";
import { Plus } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useClientTargets } from "@/hooks/useClientTargets";
import { useProjects } from "@/hooks/useProjects";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Spinner } from "@/components/Spinner";
import { ProjectColorDot } from "@/components/ProjectColorDot";
import type { Client, ClientTargetWithBalance, Project } from "@/types";

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DAY_LABELS: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};
const DEFAULT_WORKING_DAYS = ["MON", "TUE", "WED", "THU", "FRI"];

const PROJECT_COLORS = [
  "#0B6E5F",
  "#C2570C",
  "#2F5DA8",
  "#8A3FA0",
  "#B42318",
  "#B08900",
  "#3F7F2F",
  "#0E7490",
  "#C0356E",
  "#5E636A",
];

const NEW_CLIENT = "new";

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-2" role="radiogroup" aria-label="Color">
      {PROJECT_COLORS.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className="h-7 w-7 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: selected ? `0 0 0 3px #fff, 0 0 0 5px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function ClientForm({
  client,
  onSaved,
  onDeleted,
}: {
  client: Client | null;
  onSaved: (client: Client) => void;
  onDeleted: () => void;
}) {
  const { createClient, updateClient, deleteClient } = useClients();
  const [name, setName] = useState(client?.name ?? "");
  const [description, setDescription] = useState(client?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Client name is required");
      return;
    }
    try {
      const input = { name: name.trim(), description: description.trim() };
      const saved = client
        ? await updateClient.mutateAsync({ id: client.id, input })
        : await createClient.mutateAsync(input);
      onSaved(saved);
    } catch (err) {
      setError(errorText(err, "Failed to save client"));
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    try {
      await deleteClient.mutateAsync(client.id);
      onDeleted();
    } catch (err) {
      setError(errorText(err, "Failed to delete client"));
    }
  };

  const saving = createClient.isPending || updateClient.isPending;

  return (
    <section className="card px-5 py-6 sm:px-7">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-[200px] flex-[1_1_260px]">
            <label className="label" htmlFor="client-name">
              Client name
            </label>
            <input
              id="client-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!client}
            />
          </div>
          <div className="min-w-[200px] flex-[2_1_300px]">
            <label className="label" htmlFor="client-description">
              Description <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="client-description"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <div className="callout-error mt-3" role="alert">
            {error}
          </div>
        )}
        <div className="mt-4 flex justify-between gap-2">
          {client ? (
            <button type="button" className="btn-ghost-danger" onClick={() => setConfirmDelete(true)}>
              Delete client
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : client ? "Save changes" : "Create client"}
          </button>
        </div>
      </form>
      {confirmDelete && client && (
        <ConfirmModal
          title={`Delete ${client.name}?`}
          message="The client is removed from your lists. Time entries you already tracked are kept."
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </section>
  );
}

function ProjectsCard({ client, projects }: { client: Client; projects: Project[] }) {
  const { createProject, updateProject, deleteProject } = useProjects();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[projects.length % PROJECT_COLORS.length]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState(PROJECT_COLORS[0]);
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditColor(project.color ?? PROJECT_COLORS[0]);
    setError(null);
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!newName.trim()) {
      setError("Project name is required");
      return;
    }
    try {
      await createProject.mutateAsync({ name: newName.trim(), color: newColor, clientId: client.id });
      setNewName("");
      setNewColor(PROJECT_COLORS[(projects.length + 1) % PROJECT_COLORS.length]);
    } catch (err) {
      setError(errorText(err, "Failed to add project"));
    }
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);
    if (!editName.trim()) {
      setError("Project name is required");
      return;
    }
    try {
      await updateProject.mutateAsync({
        id: editingId,
        input: { name: editName.trim(), description: editDescription.trim(), color: editColor },
      });
      setEditingId(null);
    } catch (err) {
      setError(errorText(err, "Failed to save project"));
    }
  };

  const handleDelete = async () => {
    if (!confirmProject) return;
    try {
      await deleteProject.mutateAsync(confirmProject.id);
    } catch (err) {
      setError(errorText(err, "Failed to delete project"));
    }
  };

  return (
    <section className="card px-5 py-6 sm:px-7">
      <h2 className="m-0 text-lg font-bold">Projects</h2>

      <div className="mt-3">
        {projects.length === 0 && (
          <p className="row-divider m-0 py-4 text-sm text-ink-muted">
            No projects yet. Add one below to start tracking time for {client.name}.
          </p>
        )}
        {projects.map((project) =>
          editingId === project.id ? (
            <form
              key={project.id}
              onSubmit={handleSaveEdit}
              noValidate
              className="row-divider grid gap-3 py-4 sm:grid-cols-2"
            >
              <div>
                <label className="label" htmlFor={`pn-${project.id}`}>
                  Project name
                </label>
                <input
                  id={`pn-${project.id}`}
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor={`pd-${project.id}`}>
                  Description <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id={`pd-${project.id}`}
                  className="input"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <span className="label">Color</span>
                <ColorPicker value={editColor} onChange={setEditColor} />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm" disabled={updateProject.isPending}>
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div key={project.id} className="row-divider flex flex-wrap items-center gap-3.5 py-3.5">
              <ProjectColorDot color={project.color} size="h-[22px] w-[22px]" />
              <div className="min-w-[200px] flex-1">
                <b>{project.name}</b>
                {project.description && (
                  <div className="text-[13px] text-ink-muted">{project.description}</div>
                )}
              </div>
              <button type="button" className="btn btn-sm" onClick={() => startEdit(project)}>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-sm text-danger"
                onClick={() => setConfirmProject(project)}
              >
                Delete
              </button>
            </div>
          ),
        )}
      </div>

      <form
        onSubmit={handleAdd}
        noValidate
        className="mt-2 grid items-end gap-3 rounded-xl bg-paper p-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]"
      >
        <div>
          <label className="label" htmlFor="new-project-name">
            Project name
          </label>
          <input
            id="new-project-name"
            className="input"
            placeholder="e.g. Website relaunch"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div>
          <span className="label">Color</span>
          <ColorPicker value={newColor} onChange={setNewColor} />
        </div>
        <div>
          <button type="submit" className="btn-primary w-full" disabled={createProject.isPending}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add project
          </button>
        </div>
      </form>
      {error && (
        <div className="callout-error mt-3" role="alert">
          {error}
        </div>
      )}

      {confirmProject && (
        <ConfirmModal
          title={`Delete ${confirmProject.name}?`}
          message="The project is removed from your lists. Time entries you already tracked are kept."
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirmProject(null)}
        />
      )}
    </section>
  );
}

function TargetCard({
  client,
  target,
}: {
  client: Client;
  target: ClientTargetWithBalance | undefined;
}) {
  const { createTarget, updateTarget, deleteTarget } = useClientTargets();
  const [hours, setHours] = useState(target ? String(target.targetHours) : "");
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">(target?.periodType ?? "weekly");
  const [startDate, setStartDate] = useState(
    target?.startDate ?? new Date().toISOString().split("T")[0],
  );
  const [workingDays, setWorkingDays] = useState<string[]>(
    target ? [...target.workingDays] : DEFAULT_WORKING_DAYS,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const toggleDay = (day: string) => {
    setSaved(false);
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = parseFloat(hours.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0 || parsed > 168) {
      setError(`${periodType === "weekly" ? "Weekly" : "Monthly"} hours must be between 0 and 168`);
      return;
    }
    if (workingDays.length === 0) {
      setError("Select at least one working day");
      return;
    }
    if (!startDate) {
      setError("Select a start date");
      return;
    }

    const payload = { targetHours: parsed, periodType, workingDays, startDate };
    try {
      if (target) {
        await updateTarget.mutateAsync({ id: target.id, input: payload });
      } else {
        await createTarget.mutateAsync({ clientId: client.id, ...payload });
      }
      setSaved(true);
    } catch (err) {
      setError(errorText(err, "Failed to save target"));
    }
  };

  const handleRemove = async () => {
    if (!target) return;
    try {
      await deleteTarget.mutateAsync(target.id);
      setHours("");
    } catch (err) {
      setError(errorText(err, "Failed to remove target"));
    }
  };

  const saving = createTarget.isPending || updateTarget.isPending;

  return (
    <section className="card px-5 py-6 sm:px-7">
      <h2 className="m-0 text-lg font-bold">Hourly target</h2>
      <p className="mb-0 mt-0.5 text-[13px] text-ink-muted">
        One target per client. Progress shows on Today and Insights.
      </p>

      <form onSubmit={handleSave} noValidate>
        <div className="mt-[18px] grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <div>
            <label className="label" htmlFor="target-hours">
              Hours per period
            </label>
            <input
              id="target-hours"
              inputMode="decimal"
              className="input tabular"
              placeholder="e.g. 15"
              value={hours}
              onChange={(e) => {
                setSaved(false);
                setHours(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="target-period">
              Period
            </label>
            <select
              id="target-period"
              className="input"
              value={periodType}
              onChange={(e) => {
                setSaved(false);
                setPeriodType(e.target.value as "weekly" | "monthly");
              }}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="target-start">
              Starting on
            </label>
            <input
              id="target-start"
              type="date"
              className="input tabular"
              value={startDate}
              onChange={(e) => {
                setSaved(false);
                setStartDate(e.target.value);
              }}
            />
          </div>
        </div>

        <div className="mt-4">
          <span className="label">Working days</span>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const on = workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(day)}
                  className={`min-h-10 min-w-12 rounded-[10px] border text-sm font-semibold ${
                    on
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-paper-edge bg-white text-ink"
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="callout-error mt-3" role="alert">
            {error}
          </div>
        )}
        {saved && !error && (
          <div className="callout-ok mt-3" role="status">
            Target saved.
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          {target ? (
            <button type="button" className="btn-ghost-danger" onClick={() => setConfirmRemove(true)}>
              Remove target
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : target ? "Save target" : "Set target"}
          </button>
        </div>
      </form>

      <p className="mb-0 mt-4 text-[13px] text-ink-muted">
        Holidays or carried-over overtime? Add a balance correction from the target on the Insights
        screen.
      </p>

      {confirmRemove && (
        <ConfirmModal
          title={`Remove ${client.name}'s target?`}
          message="The target and its balance corrections are removed. Tracked time entries are not affected."
          confirmLabel="Remove"
          onConfirm={() => void handleRemove()}
          onClose={() => setConfirmRemove(false)}
        />
      )}
    </section>
  );
}

export function ClientsPage() {
  const { clients, isLoading } = useClients();
  const { targets } = useClientTargets();
  const { projects } = useProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return <Spinner />;
  }

  const list = clients ?? [];
  const activeId =
    selectedId === NEW_CLIENT
      ? NEW_CLIENT
      : list.some((c) => c.id === selectedId)
        ? selectedId
        : (list[0]?.id ?? NEW_CLIENT);
  const activeClient = list.find((c) => c.id === activeId) ?? null;

  const countFor = (clientId: string) => (projects ?? []).filter((p) => p.clientId === clientId).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="page-header">
        <h1 className="page-title m-0">Clients &amp; projects</h1>
        <button type="button" className="btn-primary" onClick={() => setSelectedId(NEW_CLIENT)}>
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
          New client
        </button>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <nav
          aria-label="Clients"
          className="card flex min-w-[240px] flex-[0_1_280px] flex-col gap-0.5 p-2.5"
        >
          {list.length === 0 && (
            <p className="m-0 px-3.5 py-3 text-sm text-ink-muted">No clients yet.</p>
          )}
          {list.map((client) => {
            const count = countFor(client.id);
            const on = client.id === activeId;
            return (
              <button
                key={client.id}
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => setSelectedId(client.id)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-left font-semibold ${
                  on ? "bg-primary-100 text-primary-900" : "hover:bg-paper-hover"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{client.name}</span>
                <span className="shrink-0 text-xs font-medium text-ink-muted">
                  {count} {count === 1 ? "project" : "projects"}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
          {activeClient ? (
            <>
              <ClientForm
                key={activeClient.id + activeClient.updatedAt}
                client={activeClient}
                onSaved={(saved) => setSelectedId(saved.id)}
                onDeleted={() => setSelectedId(null)}
              />
              <ProjectsCard
                key={`projects-${activeClient.id}`}
                client={activeClient}
                projects={(projects ?? []).filter((p) => p.clientId === activeClient.id)}
              />
              <TargetCard
                key={`target-${activeClient.id}-${targets?.find((t) => t.clientId === activeClient.id)?.id ?? "none"}`}
                client={activeClient}
                target={targets?.find((t) => t.clientId === activeClient.id)}
              />
            </>
          ) : (
            <ClientForm
              key="new-client"
              client={null}
              onSaved={(saved) => setSelectedId(saved.id)}
              onDeleted={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
