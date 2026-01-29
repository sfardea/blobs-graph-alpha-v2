/**
 * NodeDetails - Displays detailed information about a selected node
 * with discovery features to find related nodes
 */
import React, { useState, useCallback, useEffect } from 'react';
import { 
  X, User, Building2, FolderKanban, Layers, MapPin, Briefcase, 
  Users, Link2, Sparkles, CheckCircle, XCircle, Zap
} from 'lucide-react';
import api from '../services/api';

export default function NodeDetails({ node, onClose, onNodeSelect, onDiscoverResults }) {
  const [relatedNodes, setRelatedNodes] = useState([]);
  const [similarNodes, setSimilarNodes] = useState([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Load related nodes
  const loadRelatedNodes = useCallback(async () => {
    if (!node) return;
    
    setIsLoadingRelated(true);
    try {
      const response = await api.discoverRelated(node.id, 2, 15);
      setRelatedNodes(response.related_nodes || []);
      
      if (onDiscoverResults) {
        onDiscoverResults(response.related_nodes || []);
      }
    } catch (error) {
      console.error('Error loading related nodes:', error);
    } finally {
      setIsLoadingRelated(false);
    }
  }, [node, onDiscoverResults]);

  // Load similar nodes
  const loadSimilarNodes = useCallback(async () => {
    if (!node) return;
    
    setIsLoadingSimilar(true);
    try {
      const response = await api.findSimilar(node.id, 10);
      setSimilarNodes(response.similar_nodes || []);
    } catch (error) {
      console.error('Error loading similar nodes:', error);
    } finally {
      setIsLoadingSimilar(false);
    }
  }, [node]);

  // Load data when node changes
  useEffect(() => {
    if (node) {
      loadRelatedNodes();
      loadSimilarNodes();
    }
  }, [node, loadRelatedNodes, loadSimilarNodes]);

  if (!node) return null;

  // Get icon for node type
  const getNodeIcon = (nodeType) => {
    switch (nodeType) {
      case 'Individual': return User;
      case 'Blob': return Building2;
      case 'Aggregated': return Layers;
      case 'Project': return FolderKanban;
      default: return Zap;
    }
  };

  const NodeIcon = getNodeIcon(node.node_type);
  const getBadgeClass = (nodeType) => `badge badge-${nodeType?.toLowerCase()}`;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-80 glass z-20 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-blob-border">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
            node.node_type === 'Individual' ? 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30' :
            node.node_type === 'Blob' ? 'from-purple-500/20 to-pink-500/20 border-purple-500/30' :
            node.node_type === 'Aggregated' ? 'from-amber-500/20 to-orange-500/20 border-amber-500/30' :
            'from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
          } border`}>
            <NodeIcon size={24} className={
              node.node_type === 'Individual' ? 'text-cyan-400' :
              node.node_type === 'Blob' ? 'text-purple-400' :
              node.node_type === 'Aggregated' ? 'text-amber-400' :
              'text-emerald-400'
            } />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-blob-text">{node.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={getBadgeClass(node.node_type)}>{node.node_type}</span>
              {node.blob_type && <span className="text-xs text-blob-text-muted">• {node.blob_type}</span>}
              {node.availability !== undefined && (
                <span className={`flex items-center gap-1 text-xs ${node.availability ? 'text-green-400' : 'text-red-400'}`}>
                  {node.availability ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {node.availability ? 'Available' : 'Unavailable'}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost p-2 rounded-lg"><X size={20} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-blob-border">
        {['details', 'related', 'similar'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? 'text-blob-primary border-b-2 border-blob-primary' : 'text-blob-text-muted hover:text-blob-text'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'related' && relatedNodes.length > 0 && <span className="ml-1 text-xs opacity-60">({relatedNodes.length})</span>}
            {tab === 'similar' && similarNodes.length > 0 && <span className="ml-1 text-xs opacity-60">({similarNodes.length})</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-4">
              {node.sector && (
                <div className="flex items-start gap-2">
                  <Briefcase size={16} className="text-blob-text-dim mt-0.5" />
                  <div>
                    <div className="text-xs text-blob-text-muted">Sector</div>
                    <div className="text-sm text-blob-text">{node.sector}</div>
                  </div>
                </div>
              )}
              {node.location && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-blob-text-dim mt-0.5" />
                  <div>
                    <div className="text-xs text-blob-text-muted">Location</div>
                    <div className="text-sm text-blob-text">{node.location}</div>
                  </div>
                </div>
              )}
              {node.member_count !== undefined && (
                <div className="flex items-start gap-2">
                  <Users size={16} className="text-blob-text-dim mt-0.5" />
                  <div>
                    <div className="text-xs text-blob-text-muted">Members</div>
                    <div className="text-sm text-blob-text">{node.member_count.toLocaleString()}</div>
                  </div>
                </div>
              )}
              {node.status && (
                <div className="flex items-start gap-2">
                  <Zap size={16} className="text-blob-text-dim mt-0.5" />
                  <div>
                    <div className="text-xs text-blob-text-muted">Status</div>
                    <div className="text-sm text-blob-text capitalize">{node.status.replace('_', ' ')}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {node.skills && node.skills.length > 0 && (
                <div>
                  <div className="text-xs text-blob-text-muted mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {node.skills.map((skill) => <span key={skill} className="skill-tag">{skill}</span>)}
                  </div>
                </div>
              )}
              {node.required_skills && node.required_skills.length > 0 && (
                <div>
                  <div className="text-xs text-blob-text-muted mb-2">Required Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {node.required_skills.map((skill) => <span key={skill} className="skill-tag">{skill}</span>)}
                  </div>
                </div>
              )}
              {(node.bio || node.description) && (
                <div>
                  <div className="text-xs text-blob-text-muted mb-1">{node.bio ? 'Bio' : 'Description'}</div>
                  <p className="text-sm text-blob-text-muted">{node.bio || node.description}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {node.blob_memberships && node.blob_memberships.length > 0 && (
                <div><div className="text-xs text-blob-text-muted mb-2">Member of</div><div className="text-sm text-blob-text">{node.blob_memberships.length} blob(s)</div></div>
              )}
              {node.child_blob_ids && node.child_blob_ids.length > 0 && (
                <div><div className="text-xs text-blob-text-muted mb-2">Contains</div><div className="text-sm text-blob-text">{node.child_blob_ids.length} blob(s)</div></div>
              )}
              <div className="pt-2 border-t border-blob-border">
                <div className="text-xs text-blob-text-dim">Node ID</div>
                <div className="text-xs font-mono text-blob-text-muted truncate">{node.id}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'related' && (
          <div>
            {isLoadingRelated ? (
              <div className="flex items-center justify-center py-8"><div className="spinner" /></div>
            ) : relatedNodes.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {relatedNodes.map((relatedNode) => {
                  const RelatedIcon = getNodeIcon(relatedNode.node_type);
                  return (
                    <div key={relatedNode.id} onClick={() => onNodeSelect && onNodeSelect(relatedNode)} className="card-hover p-3 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <RelatedIcon size={14} className="text-blob-text-muted" />
                        <span className={getBadgeClass(relatedNode.node_type)}>{relatedNode.node_type}</span>
                      </div>
                      <div className="text-sm font-medium text-blob-text truncate">{relatedNode.name}</div>
                      {relatedNode.sector && <div className="text-xs text-blob-text-dim truncate mt-1">{relatedNode.sector}</div>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8"><Link2 size={32} className="text-blob-border mb-2" /><p className="text-sm">No related nodes found</p></div>
            )}
          </div>
        )}

        {activeTab === 'similar' && (
          <div>
            {isLoadingSimilar ? (
              <div className="flex items-center justify-center py-8"><div className="spinner" /></div>
            ) : similarNodes.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {similarNodes.map((similarNode) => {
                  const SimilarIcon = getNodeIcon(similarNode.node_type);
                  return (
                    <div key={similarNode.id} onClick={() => onNodeSelect && onNodeSelect(similarNode)} className="card-hover p-3 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={12} className="text-blob-primary" />
                        <span className={getBadgeClass(similarNode.node_type)}>{similarNode.node_type}</span>
                      </div>
                      <div className="text-sm font-medium text-blob-text truncate">{similarNode.name}</div>
                      {similarNode.skills && similarNode.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {similarNode.skills.slice(0, 2).map((skill) => <span key={skill} className="text-xs text-blob-text-dim">{skill}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8"><Sparkles size={32} className="text-blob-border mb-2" /><p className="text-sm">No similar nodes found</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
