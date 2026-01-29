/**
 * SearchPanel - Search interface with filters and results
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Filter, X, Users, Briefcase, Building2, FolderKanban, ChevronDown, MapPin, Sparkles } from 'lucide-react';
import api from '../services/api';

const NODE_TYPE_OPTIONS = [
  { value: 'Individual', label: 'Individuals', icon: Users, color: 'node-individual' },
  { value: 'Blob', label: 'Blobs', icon: Building2, color: 'node-blob' },
  { value: 'Aggregated', label: 'Corporations', icon: Building2, color: 'node-aggregated' },
  { value: 'Project', label: 'Projects', icon: FolderKanban, color: 'node-project' },
];

const SECTORS = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
  'Media', 'Energy', 'Consulting', 'Telecommunications', 'Aerospace'
];

const POPULAR_SKILLS = [
  'Python', 'JavaScript', 'React', 'Machine Learning', 'AWS',
  'Docker', 'SQL', 'Node.js', 'Data Analysis', 'TypeScript'
];

export default function SearchPanel({ onResultSelect, onResultsUpdate, isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    nodeTypes: [],
    skills: [],
    sector: '',
    location: '',
    availability: null,
  });
  const [queryTime, setQueryTime] = useState(null);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery, searchFilters) => {
    if (!searchQuery && searchFilters.nodeTypes.length === 0 && !searchFilters.sector) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await api.search({
        query: searchQuery || undefined,
        node_types: searchFilters.nodeTypes.length > 0 ? searchFilters.nodeTypes : undefined,
        skills: searchFilters.skills.length > 0 ? searchFilters.skills : undefined,
        sector: searchFilters.sector || undefined,
        location: searchFilters.location || undefined,
        availability: searchFilters.availability,
        limit: 50,
      });

      setResults(response.nodes || []);
      setQueryTime(response.query_time_ms);
      
      if (onResultsUpdate) {
        onResultsUpdate(response.nodes || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onResultsUpdate]);

  // Handle search input change with debounce
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value, filters);
    }, 300);
  }, [filters, performSearch]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (filterType === 'nodeTypes') {
        if (prev.nodeTypes.includes(value)) {
          newFilters.nodeTypes = prev.nodeTypes.filter((t) => t !== value);
        } else {
          newFilters.nodeTypes = [...prev.nodeTypes, value];
        }
      } else if (filterType === 'skills') {
        if (prev.skills.includes(value)) {
          newFilters.skills = prev.skills.filter((s) => s !== value);
        } else {
          newFilters.skills = [...prev.skills, value];
        }
      } else {
        newFilters[filterType] = value;
      }

      // Trigger search with new filters
      performSearch(query, newFilters);
      return newFilters;
    });
  }, [query, performSearch]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      nodeTypes: [],
      skills: [],
      sector: '',
      location: '',
      availability: null,
    });
    setQuery('');
    setResults([]);
  }, []);

  // Handle result click
  const handleResultClick = useCallback((node) => {
    if (onResultSelect) {
      onResultSelect(node);
    }
  }, [onResultSelect]);

  // Get badge class for node type
  const getBadgeClass = (nodeType) => {
    return `badge badge-${nodeType?.toLowerCase()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-0 h-full w-96 glass z-30 flex flex-col panel-slide-left">
      {/* Header */}
      <div className="p-4 border-b border-blob-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-blob-text flex items-center gap-2">
            <Search size={20} className="text-blob-primary" />
            Search
          </h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blob-text-dim" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search by name, skill, or keyword..."
            className="input pl-10"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blob-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mt-3 flex items-center gap-2 text-sm text-blob-text-muted hover:text-blob-text transition-colors"
        >
          <Filter size={16} />
          <span>Filters</span>
          <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          {(filters.nodeTypes.length > 0 || filters.skills.length > 0 || filters.sector) && (
            <span className="px-2 py-0.5 bg-blob-primary/20 text-blob-primary text-xs rounded-full">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="p-4 border-b border-blob-border space-y-4 animate-slide-down">
          {/* Node types */}
          <div>
            <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
              Node Type
            </label>
            <div className="flex flex-wrap gap-2">
              {NODE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('nodeTypes', option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    filters.nodeTypes.includes(option.value)
                      ? 'bg-blob-primary/20 text-blob-primary border border-blob-primary'
                      : 'bg-blob-card border border-blob-border text-blob-text-muted hover:border-blob-primary/50'
                  }`}
                >
                  <option.icon size={14} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sector */}
          <div>
            <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
              Sector
            </label>
            <select
              value={filters.sector}
              onChange={(e) => handleFilterChange('sector', e.target.value)}
              className="input"
            >
              <option value="">All sectors</option>
              {SECTORS.map((sector) => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
              Skills
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleFilterChange('skills', skill)}
                  className={`skill-tag cursor-pointer transition-all ${
                    filters.skills.includes(skill)
                      ? 'bg-blob-primary/30 border-blob-primary'
                      : 'hover:bg-blob-primary/20'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="text-xs text-blob-text-muted uppercase tracking-wider mb-2 block">
              Availability
            </label>
            <div className="flex gap-2">
              {[
                { value: null, label: 'Any' },
                { value: true, label: 'Available' },
                { value: false, label: 'Unavailable' },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => handleFilterChange('availability', option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    filters.availability === option.value
                      ? 'bg-blob-primary/20 text-blob-primary border border-blob-primary'
                      : 'bg-blob-card border border-blob-border text-blob-text-muted hover:border-blob-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          <button
            onClick={clearFilters}
            className="text-sm text-blob-text-muted hover:text-blob-danger transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Results count */}
        {results.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-blob-text-muted">
              {results.length} results found
            </span>
            {queryTime && (
              <span className="text-xs text-blob-text-dim">
                {queryTime.toFixed(1)}ms
              </span>
            )}
          </div>
        )}

        {/* Results list */}
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((node) => (
              <div
                key={node.id}
                onClick={() => handleResultClick(node)}
                className="card-hover p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-blob-text truncate">
                      {node.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={getBadgeClass(node.node_type)}>
                        {node.node_type}
                      </span>
                      {node.availability !== undefined && (
                        <span className={`text-xs ${node.availability ? 'text-green-400' : 'text-red-400'}`}>
                          {node.availability ? '● Available' : '● Unavailable'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional info */}
                <div className="mt-2 space-y-1">
                  {node.sector && (
                    <div className="flex items-center gap-1.5 text-xs text-blob-text-muted">
                      <Briefcase size={12} />
                      {node.sector}
                    </div>
                  )}
                  {node.location && (
                    <div className="flex items-center gap-1.5 text-xs text-blob-text-muted">
                      <MapPin size={12} />
                      {node.location}
                    </div>
                  )}
                  {node.skills && node.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {node.skills.slice(0, 4).map((skill) => (
                        <span key={skill} className="skill-tag text-xs">
                          {skill}
                        </span>
                      ))}
                      {node.skills.length > 4 && (
                        <span className="text-xs text-blob-text-dim">
                          +{node.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : query || filters.nodeTypes.length > 0 ? (
          <div className="empty-state">
            <Search size={48} className="text-blob-border mb-4" />
            <p>No results found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={48} className="text-blob-primary mb-4" />
            <p>Start searching</p>
            <p className="text-sm mt-1">Enter a name, skill, or use filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
