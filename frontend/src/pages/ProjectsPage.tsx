import { useState } from 'react';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { Modal } from '@/components/Modal';
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

  const handleDelete = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) {
      return;
    }

    try {
      await deleteProject.mutateAsync(project.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        </div>
        <div className="card text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="mt-2 text-gray-600">Please create a client first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Add Project
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <div key={project.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <ProjectColorDot color={project.color} size="w-4 h-4" />
                  <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500">{project.client.name}</p>
              </div>
              <div className="flex space-x-1 ml-2">
                <button onClick={() => handleOpenModal(project)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(project)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
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
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
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
                  <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={`w-8 h-8 rounded-full ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} style={{ backgroundColor: color }} />
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
    </div>
  );
}