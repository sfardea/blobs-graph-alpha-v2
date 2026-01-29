/**
 * NodeEditor - Panel for creating and editing nodes
 */
import React, { useState, useCallback } from 'react';
import { X, Plus, User, Building2, FolderKanban, Trash2, Check, AlertCircle } from 'lucide-react';
import api from '../services/api';

const NODE_TYPES = [
  { value: 'individual', label: 'Individual', icon: User, description: 'A professional with skills' },
  { value: 'blob', label: 'Blob', icon: Building2, description: 'A collective or company' },
  { value: 'project', label: 'Project', icon: FolderKanban, description: 'A mission or initiative' },
];

const BLOB_TYPES = [
  { value: 'Company', label: 'Company' },
  { value: 'Internal', label: 'Internal (part of larger corp)' },
  { value: 'Independent', label: 'Independent Collective' },
];

const PROJECT_TYPES = [
  { value: 'mission', label: 'Mission' },
  { value: 'r&d', label: 'R&D' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'exploration', label: 'Exploration' },
];

const PROJECT_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
  { value: 'abandoned', label: 'Abandoned' },
];

const SECTORS = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
  'Media', 'Energy', 'Consulting', 'Telecommunications', 'Aerospace'
];

const POPULAR_SKILLS = [
  'Python', 'JavaScript', 'React', 'Machine Learning', 'AWS',
  'Docker', 'SQL', 'Node.js', 'Data Analysis', 'TypeScript',
  'Java', 'Go', 'Kubernetes', 'Product Management', 'UX Design'
];

export default function NodeEditor({ isOpen, onClose, onNodeCreated, onNodeDeleted, selectedNode }) {
  const [nodeType, setNodeType] = useState('individual');
  const [formData, setFormData] = useState({
    name: '',
    skills: [],
    availability: true,
    location: '',
    sector: '',
    bio: '',
    blob_type: 'Independent',
    description: '',
    project_type: 'mission',
    status: 'idea',
    required_skills: [],
  });
  const [customSkill, setCustomSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      skills: [],
      availability: true,
      location: '',
      sector: '',
      bio: '',
      blob_type: 'Independent',
      description: '',
      project_type: 'mission',
      status: 'idea',
      required_skills: [],
    });
    setCustomSkill('');
    setError(null);
    setSuccess(null);
  }, []);

  // Handle input change
  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // Toggle skill
  const toggleSkill = useCallback((skill, field = 'skills') => {
    setFormData((prev) => {
      const skills = prev[field];
      if (skills.includes(skill)) {
        return { ...prev, [field]: skills.filter((s) => s !== skill) };
      } else {
        return { ...prev, [field]: [...skills, skill] };
      }
    });
  }, []);

  // Add custom skill
  const addCustomSkill = useCallback((field = 'skills') => {
    if (customSkill.trim() && !formData[field].includes(customSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], customSkill.trim()],
      }));
      setCustomSkill('');
    }
  }, [customSkill, formData]);

  // Submit form
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let response;

      if (nodeType === 'individual') {
        response = await api.createIndividual({
          name: formData.name,
          skills: formData.skills,
          availability: formData.availability,
          location: formData.location || null,
          sector: formData.sector || null,
          bio: formData.bio || null,
        });
      } else if (nodeType === 'blob') {
        response = await api.createBlob({
          name: formData.name,
          blob_type: formData.blob_type,
          sector: formData.sector || null,
          description: formData.description || null,
          location: formData.location || null,
        });
      } else if (nodeType === 'project') {
        response = await api.createProject({
          name: formData.name,
          project_type: formData.project_type,
          status: formData.status,
          description: formData.description || null,
          required_skills: formData.required_skills,
          sector: formData.sector || null,
          location: formData.location || null,
        });
      }

      if (response.success) {
        setSuccess(`${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} created successfully!`);
        if (onNodeCreated) {
          onNodeCreated(response.node);
        }
        setTimeout(() => {
          resetForm();
        }, 1500);
      } else {
        setError(response.message || 'Failed to create node');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [nodeType, formData, onNodeCreated, resetForm]);

  // Delete node
  const handleDelete = useCallback(async () => {
    if (!selectedNode) return;

    if (!confirm(`Are you sure you want to delete "${selectedNode.name}"?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.deleteNode(selectedNode.id);
      if (response.success) {
        setSuccess('Node deleted successfully');
        if (onNodeDeleted) {
          onNodeDeleted(selectedNode.id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to delete node');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedNode, onNodeDeleted]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 glass z-30 flex flex-col panel-slide-left overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-blob-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-blob-text flex items-center gap-2">
            <Plus size={20} className="text-blob-accent" />
            Create Node
          </h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Node type selection */}
      <div className="p-4 border-b border-blob-border">
        <div className="grid grid-cols-3 gap-2">
          {NODE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                setNodeType(type.value);
                resetForm();
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                nodeType === type.value
                  ? 'bg-blob-primary/20 border border-blob-primary text-blob-primary'
                  : 'bg-blob-card border border-blob-border text-blob-text-muted hover:border-blob-primary/50'
              }`}
            >
              <type.icon size={20} />
              <span className="text-xs font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={nodeType === 'individual' ? 'John Doe' : nodeType === 'blob' ? 'My Company' : 'Project Name'}
            className="input"
            required
          />
        </div>

        {/* Individual-specific fields */}
        {nodeType === 'individual' && (
          <>
            {/* Availability */}
            <div>
              <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                Availability
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('availability', true)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                    formData.availability
                      ? 'bg-green-500/20 border border-green-500 text-green-400'
                      : 'bg-blob-card border border-blob-border text-blob-text-muted'
                  }`}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('availability', false)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                    !formData.availability
                      ? 'bg-red-500/20 border border-red-500 text-red-400'
                      : 'bg-blob-card border border-blob-border text-blob-text-muted'
                  }`}
                >
                  Unavailable
                </button>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                Skills
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {POPULAR_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`skill-tag cursor-pointer transition-all ${
                      formData.skills.includes(skill)
                        ? 'bg-blob-primary/30 border-blob-primary'
                        : 'hover:bg-blob-primary/20'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                  placeholder="Add custom skill"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={() => addCustomSkill()}
                  className="btn btn-secondary"
                >
                  Add
                </button>
              </div>
              {formData.skills.length > 0 && (
                <div className="mt-2 text-xs text-blob-text-muted">
                  Selected: {formData.skills.join(', ')}
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Brief description..."
                className="input min-h-[80px] resize-none"
              />
            </div>
          </>
        )}

        {/* Blob-specific fields */}
        {nodeType === 'blob' && (
          <>
            <div>
              <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                Blob Type
              </label>
              <select
                value={formData.blob_type}
                onChange={(e) => handleChange('blob_type', e.target.value)}
                className="input"
              >
                {BLOB_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="What does this blob do?"
                className="input min-h-[80px] resize-none"
              />
            </div>
          </>
        )}

        {/* Project-specific fields */}
        {nodeType === 'project' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                  Project Type
                </label>
                <select
                  value={formData.project_type}
                  onChange={(e) => handleChange('project_type', e.target.value)}
                  className="input"
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="input"
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                Required Skills
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {POPULAR_SKILLS.slice(0, 10).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill, 'required_skills')}
                    className={`skill-tag cursor-pointer transition-all ${
                      formData.required_skills.includes(skill)
                        ? 'bg-blob-primary/30 border-blob-primary'
                        : 'hover:bg-blob-primary/20'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Project objectives and details..."
                className="input min-h-[80px] resize-none"
              />
            </div>
          </>
        )}

        {/* Common fields */}
        <div>
          <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
            Sector
          </label>
          <select
            value={formData.sector}
            onChange={(e) => handleChange('sector', e.target.value)}
            className="input"
          >
            <option value="">Select sector</option>
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="e.g., San Francisco, CA"
            className="input"
          />
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
            <Check size={16} />
            {success}
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="p-4 border-t border-blob-border space-y-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.name.trim()}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus size={18} />
              Create {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
            </>
          )}
        </button>

        {selectedNode && (
          <button
            onClick={handleDelete}
            disabled={isSubmitting}
            className="btn w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
          >
            <Trash2 size={18} />
            Delete Selected Node
          </button>
        )}
      </div>
    </div>
  );
}
