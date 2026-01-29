/**
 * Blobs Platform - Main Application
 * Professional Networking Graph Platform
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Search, Plus, Wifi, WifiOff, RefreshCw, Layers } from 'lucide-react';
import GraphCanvas from './components/GraphCanvas';
import SearchPanel from './components/SearchPanel';
import NodeEditor from './components/NodeEditor';
import NodeDetails from './components/NodeDetails';
import useGraphWebSocket from './hooks/useGraphWebSocket';
import api from './services/api';

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [zoomLevel, setZoomLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const handleWebSocketMessage = useCallback((message) => {
    if (message.type === 'viewport_data') {
      setGraphData(message.payload);
    } else if (message.type === 'node_created') {
      setGraphData((prev) => prev ? { ...prev, nodes: [...prev.nodes, message.node], total_nodes: prev.total_nodes + 1 } : prev);
    } else if (message.type === 'node_deleted') {
      setGraphData((prev) => prev ? {
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== message.node_id),
        edges: prev.edges.filter((e) => e.source !== message.node_id && e.target !== message.node_id),
        total_nodes: prev.total_nodes - 1,
      } : prev);
      if (selectedNode?.id === message.node_id) setSelectedNode(null);
    }
  }, [selectedNode]);

  const { isConnected, focusNode } = useGraphWebSocket(handleWebSocketMessage);

  const loadGraph = useCallback(async (zoom = 0) => {
    setIsLoading(true);
    try {
      console.log('Fetching graph data with zoom level:', zoom);
      const [graphResponse, statsResponse] = await Promise.all([
        api.getFullGraph(zoom, zoom === 0 ? 500 : zoom === 1 ? 1000 : 2000),
        api.getStats(),
      ]);
      console.log('Graph response:', {
        nodes: graphResponse.nodes?.length,
        edges: graphResponse.edges?.length,
        total_nodes: graphResponse.total_nodes
      });
      console.log('Stats response:', statsResponse);
      setGraphData(graphResponse);
      setStats(statsResponse);
    } catch (error) {
      console.error('Error loading graph:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadGraph(0); }, [loadGraph]);

  const handleZoomChange = useCallback((newZoom) => {
    if (newZoom !== zoomLevel) {
      setZoomLevel(newZoom);
      loadGraph(newZoom);
    }
  }, [zoomLevel, loadGraph]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    setHighlightedNodes(new Set([node.id]));
  }, []);

  const handleSearchResultSelect = useCallback((node) => {
    setSelectedNode(node);
    setHighlightedNodes(new Set([node.id]));
    setIsSearchOpen(false);
    if (isConnected) focusNode(node.id, 3);
  }, [isConnected, focusNode]);

  const handleSearchResults = useCallback((results) => {
    setHighlightedNodes(new Set(results.map((n) => n.id)));
  }, []);

  const handleNodeCreated = useCallback((node) => { setSelectedNode(node); }, []);
  const handleNodeDeleted = useCallback((nodeId) => { if (selectedNode?.id === nodeId) setSelectedNode(null); }, [selectedNode]);
  
  const handleDiscoverResults = useCallback((relatedNodes) => {
    const nodeIds = new Set(relatedNodes.map((n) => n.id));
    if (selectedNode) nodeIds.add(selectedNode.id);
    setHighlightedNodes(nodeIds);
  }, [selectedNode]);

  const handleCloseDetails = useCallback(() => {
    setSelectedNode(null);
    setHighlightedNodes(new Set());
  }, []);

  const handleRefresh = useCallback(() => { loadGraph(zoomLevel); }, [loadGraph, zoomLevel]);

  return (
    <div className="h-screen w-screen flex flex-col bg-blob-bg overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-blob-border glass z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blob-primary to-blob-secondary flex items-center justify-center shadow-glow-sm">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold gradient-text">BLOBS</h1>
              <p className="text-xs text-blob-text-dim -mt-1">Professional Network Graph</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <div className="hidden md:flex items-center gap-6 px-4 py-2 bg-blob-surface rounded-lg border border-blob-border">
              <div className="text-center">
                <div className="text-lg font-display font-bold text-blob-primary">{stats.total_nodes?.toLocaleString()}</div>
                <div className="text-xs text-blob-text-dim">Nodes</div>
              </div>
              <div className="w-px h-8 bg-blob-border" />
              <div className="text-center">
                <div className="text-lg font-display font-bold text-blob-secondary">{stats.total_edges?.toLocaleString()}</div>
                <div className="text-xs text-blob-text-dim">Edges</div>
              </div>
            </div>
          )}
          <button onClick={handleRefresh} disabled={isLoading} className="btn-ghost p-2 rounded-lg" title="Refresh Graph">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setIsSearchOpen(!isSearchOpen); setIsEditorOpen(false); }} className={`btn ${isSearchOpen ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}>
            <Search size={18} /><span className="hidden sm:inline">Search</span>
          </button>
          <button onClick={() => { setIsEditorOpen(!isEditorOpen); setIsSearchOpen(false); }} className={`btn ${isEditorOpen ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}>
            <Plus size={18} /><span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative overflow-hidden">
        <GraphCanvas graphData={graphData} onNodeClick={handleNodeClick} onNodeHover={() => {}} selectedNodeId={selectedNode?.id} highlightedNodes={highlightedNodes} zoomLevel={zoomLevel} onZoomChange={handleZoomChange} isLoading={isLoading} />
        <SearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onResultSelect={handleSearchResultSelect} onResultsUpdate={handleSearchResults} />
        <NodeEditor isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} onNodeCreated={handleNodeCreated} onNodeDeleted={handleNodeDeleted} selectedNode={selectedNode} />
        {selectedNode && !isSearchOpen && !isEditorOpen && (
          <NodeDetails node={selectedNode} onClose={handleCloseDetails} onNodeSelect={handleNodeClick} onDiscoverResults={handleDiscoverResults} />
        )}

        {/* Zoom level selector */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="glass rounded-full px-2 py-1 flex items-center gap-1">
            {[{ level: 0, label: 'Coarse', desc: 'Blobs & Projects' }, { level: 1, label: 'Medium', desc: 'Expanded' }, { level: 2, label: 'Detail', desc: 'Individuals' }].map((item) => (
              <button key={item.level} onClick={() => handleZoomChange(item.level)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${zoomLevel === item.level ? 'bg-blob-primary text-white shadow-glow-sm' : 'text-blob-text-muted hover:text-blob-text hover:bg-blob-card'}`} title={item.desc}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Help */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass rounded-lg px-4 py-2 text-xs text-blob-text-muted">
          <span className="text-blob-primary">Click</span> node to select • <span className="text-blob-primary">Scroll</span> to zoom • <span className="text-blob-primary">Drag</span> to pan • <span className="text-blob-primary">3-level</span> connection limit
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 flex items-center justify-between px-6 border-t border-blob-border text-xs text-blob-text-dim">
        <div className="flex items-center gap-4">
          <span>Blobs Platform Alpha v0.1.0</span>
          {graphData && <span className="text-blob-text-muted">Showing {graphData.viewport_nodes?.toLocaleString() || 0} of {graphData.total_nodes?.toLocaleString() || 0} nodes</span>}
        </div>
        <span>NetworkX + Sigma.js + FastAPI</span>
      </footer>
    </div>
  );
}
