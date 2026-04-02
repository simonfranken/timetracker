import { useState } from 'react';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Spinner } from '@/components/Spinner';
import { ProjectColorDot } from '@/components/ProjectColorDot';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#6b7280', '#374151',
];

export function ProjectsPage() {
  const { projects, isLoading: projectsLoading, createProject, updateProject, deleteProject } = useProjects();
  const { clients, isLoading: clientsLoading } = useClients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    color: '#3b82f6',
    clientId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const isLoading = projectsLoading || clientsLoading;

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        color: project.color || '#3b82f6',
        clientId: project.clientId,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        color: '#3b82f6',
        clientId: clients?.[0]?.id || '',
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData({ name: '', description: '', color: '#3b82f6', clientId: '' });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }

    try {
      if (editingProject) {
        await updateProject.mutateAsync({
          id: editingProject.id,
          input: formData as UpdateProjectInput,
        });
      } else {
        await createProject.mutateAsync(formData);
      }
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    }
  };

  const [confirmProject, setConfirmProject] = useState<Project | null>(null);

  const handleDeleteConfirmed = async () => {
    if (!confirmProject) return;
    try {
      await deleteProject.mutateAsync(confirmProject.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (!clients?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Organize workstreams across your clients</p>
        </div>
        <div className="card text-center py-12">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <p className="mt-2 text-slate-600">Please create a client first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Organize workstreams across your clients</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Add Project
        </button>
      </div>

      <div className="surface-muted flex items-center justify-between px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project Portfolio</span>
        <span className="chip bg-white text-slate-700">{projects?.length ?? 0} total</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <div key={project.id} className="card border-slate-200/90 bg-gradient-to-br from-white via-white to-cyan-50/40">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <ProjectColorDot color={project.color} size="w-4 h-4" />
                  <h3 className="truncate text-base font-semibold text-slate-900">{project.name}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">{project.client.name}</p>
                {project.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{project.description}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">No description yet</p>
                )}
              </div>
              <div className="flex space-x-1 ml-2">
                <button onClick={() => handleOpenModal(project)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => setConfirmProject(project)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal
          title={editingProject ? 'Edit Project' : 'Add Project'}
          onClose={handleCloseModal}
        >
          {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Project Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Client</label>
              <select value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className="input">
                {clients?.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={`h-8 w-8 rounded-full ${formData.color === color ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createProject.isPending || updateProject.isPending}
              >
                {createProject.isPending || updateProject.isPending
                  ? 'Saving...'
                  : editingProject
                  ? 'Save'
                  : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmProject && (
        <ConfirmModal
          title={`Delete "${confirmProject.name}"`}
          message="Are you sure you want to delete this project?"
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmProject(null)}
        />
      )}
    </div>
  );
}
