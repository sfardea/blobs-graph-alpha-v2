/**
 * GraphCanvas - Main graph visualization component using Sigma.js
 * Handles WebGL rendering, zoom, pan, and node interactions
 * Now with Focus Mode for node-level exploration
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { ZoomIn, ZoomOut, Maximize2, Focus, X, Users, GitBranch } from 'lucide-react';

// Node type colors
const NODE_COLORS = {
  Individual: '#06b6d4',
  Blob: '#8b5cf6',
  Aggregated: '#f59e0b',
  Project: '#10b981',
  Skill: '#ec4899',
  Sector: '#3b82f6',
};

// Node size by type
const NODE_SIZES = {
  Individual: 5,
  Blob: 14,
  Aggregated: 22,
  Project: 12,
  Skill: 6,
  Sector: 8,
};

// Edge colors by type
const EDGE_COLORS = {
  member_of: '#4299E1',
  works_on: '#48BB78',
  has_skill: '#ED8936',
  executes: '#48BB78',
  requires: '#F56565',
  collaborates: '#9F7AEA',
  contains: '#F59E0B',
  in_sector: '#3B82F6',
  peer: '#06b6d4',
};

export default function GraphCanvas({
  graphData,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  highlightedNodes = new Set(),
  zoomLevel,
  onZoomChange,
  isLoading,
  onFocusModeChange,
}) {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const graphRef = useRef(null);
  const fullGraphDataRef = useRef(null);
  
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Focus mode state
  const [focusMode, setFocusMode] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState(null);
  const [focusDepth, setFocusDepth] = useState(1);
  const [focusedNodes, setFocusedNodes] = useState(new Set());
  const [focusedEdges, setFocusedEdges] = useState(new Set());

  // Get neighbors up to N hops
  const getNeighborsAtDepth = useCallback((nodeId, depth, graphData) => {
    if (!graphData || !graphData.nodes) return { nodes: new Set(), edges: new Set() };
    
    const nodeSet = new Set([nodeId]);
    const edgeSet = new Set();
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
    
    // Build adjacency list from edges
    const adjacency = new Map();
    graphData.edges?.forEach(edge => {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
      adjacency.get(edge.source).push({ neighbor: edge.target, edge });
      adjacency.get(edge.target).push({ neighbor: edge.source, edge });
    });
    
    // BFS to find neighbors
    let currentLevel = new Set([nodeId]);
    for (let d = 0; d < depth; d++) {
      const nextLevel = new Set();
      currentLevel.forEach(nid => {
        const neighbors = adjacency.get(nid) || [];
        neighbors.forEach(({ neighbor, edge }) => {
          if (!nodeSet.has(neighbor)) {
            nextLevel.add(neighbor);
            nodeSet.add(neighbor);
          }
          // Add edge if both endpoints are in nodeSet
          if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
            edgeSet.add(edge.id || `${edge.source}-${edge.target}`);
          }
        });
      });
      currentLevel = nextLevel;
    }
    
    // Final pass to add all edges between selected nodes
    graphData.edges?.forEach(edge => {
      if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
        edgeSet.add(edge.id || `${edge.source}-${edge.target}`);
      }
    });
    
    return { nodes: nodeSet, edges: edgeSet };
  }, []);

  // Enter focus mode
  const enterFocusMode = useCallback((nodeId) => {
    if (!fullGraphDataRef.current) return;
    
    setFocusMode(true);
    setFocusNodeId(nodeId);
    
    const { nodes, edges } = getNeighborsAtDepth(nodeId, focusDepth, fullGraphDataRef.current);
    setFocusedNodes(nodes);
    setFocusedEdges(edges);
    
    if (onFocusModeChange) onFocusModeChange(true, nodeId);
  }, [focusDepth, getNeighborsAtDepth, onFocusModeChange]);

  // Exit focus mode
  const exitFocusMode = useCallback(() => {
    setFocusMode(false);
    setFocusNodeId(null);
    setFocusedNodes(new Set());
    setFocusedEdges(new Set());
    
    if (onFocusModeChange) onFocusModeChange(false, null);
    
    // Re-render full graph
    if (fullGraphDataRef.current && graphRef.current) {
      updateGraph(fullGraphDataRef.current, false);
    }
  }, [onFocusModeChange]);

  // Update focus depth
  const handleDepthChange = useCallback((newDepth) => {
    setFocusDepth(newDepth);
    
    if (focusMode && focusNodeId && fullGraphDataRef.current) {
      const { nodes, edges } = getNeighborsAtDepth(focusNodeId, newDepth, fullGraphDataRef.current);
      setFocusedNodes(nodes);
      setFocusedEdges(edges);
    }
  }, [focusMode, focusNodeId, getNeighborsAtDepth]);

  // Create or update graph
  const updateGraph = useCallback((data, applyFocusFilter = true) => {
    if (!data || !data.nodes) return;

    // Store full data
    fullGraphDataRef.current = data;

    // Create new graph if needed
    if (!graphRef.current) {
      graphRef.current = new Graph();
    }

    const graph = graphRef.current;
    graph.clear();

    // Determine which nodes/edges to show
    const showFocusMode = applyFocusFilter && focusMode && focusedNodes.size > 0;
    
    // Filter nodes based on focus mode
    const nodesToShow = showFocusMode 
      ? data.nodes.filter(n => focusedNodes.has(n.id))
      : data.nodes;

    // Calculate center position for focus mode layout
    let centerX = 500, centerY = 500;
    if (showFocusMode && focusNodeId) {
      const focusNode = data.nodes.find(n => n.id === focusNodeId);
      if (focusNode) {
        centerX = focusNode.x || 500;
        centerY = focusNode.y || 500;
      }
    }

    // Add nodes
    nodesToShow.forEach((node, index) => {
      // Skip if node already exists in graph
      if (graph.hasNode(node.id)) {
        return;
      }
      
      const nodeType = node.node_type || 'Individual';
      const isSelected = node.id === selectedNodeId;
      const isHighlighted = highlightedNodes.has(node.id);
      const isFocusCenter = node.id === focusNodeId;
      
      // In focus mode, arrange nodes in a radial layout
      let x = node.x || Math.random() * 1000;
      let y = node.y || Math.random() * 1000;
      
      if (showFocusMode && !isFocusCenter) {
        // Arrange neighbors in a circle around the focus node
        const nonCenterNodes = nodesToShow.filter(n => n.id !== focusNodeId);
        const nodeIndex = nonCenterNodes.findIndex(n => n.id === node.id);
        const angle = (2 * Math.PI * nodeIndex) / nonCenterNodes.length;
        const radius = 150 + (focusDepth * 80);
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      } else if (isFocusCenter) {
        x = centerX;
        y = centerY;
      }

      // Size multiplier for focus mode
      const sizeMultiplier = isFocusCenter ? 2.5 : (showFocusMode ? 1.5 : 1);
      
      graph.addNode(node.id, {
        x: x,
        y: y,
        size: (NODE_SIZES[nodeType] || 5) * sizeMultiplier * (isSelected ? 1.3 : 1),
        color: isFocusCenter ? '#ffffff' : (isSelected ? '#ffffff' : (isHighlighted ? '#22d3ee' : NODE_COLORS[nodeType] || '#666666')),
        label: node.name || node.id,
        nodeData: node,
        isFocusCenter: isFocusCenter,
      });
    });

    // Add edges
    if (data.edges) {
      const nodeIdsInGraph = new Set(nodesToShow.map(n => n.id));
      
      data.edges.forEach((edge, index) => {
        const edgeId = edge.id || `edge-${index}`;
        const showEdge = !showFocusMode || (nodeIdsInGraph.has(edge.source) && nodeIdsInGraph.has(edge.target));
        
        if (showEdge && graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          if (!graph.hasEdge(edgeId)) {
            graph.addEdge(edge.source, edge.target, {
              id: edgeId,
              size: showFocusMode ? 2 : 1,
              color: EDGE_COLORS[edge.edge_type] || '#2a3a4d',
              type: 'line',
            });
          }
        }
      });
    }

    // Refresh Sigma
    if (sigmaRef.current) {
      sigmaRef.current.refresh();
      
      // In focus mode, center camera on the focus node
      if (showFocusMode && focusNodeId) {
        setTimeout(() => {
          const camera = sigmaRef.current.getCamera();
          camera.animate({
            x: centerX,
            y: centerY,
            ratio: 0.5,
          }, { duration: 300 });
        }, 50);
      }
    }
  }, [selectedNodeId, highlightedNodes, focusMode, focusedNodes, focusedEdges, focusNodeId, focusDepth]);

  // Re-render when focus state changes
  useEffect(() => {
    if (fullGraphDataRef.current) {
      updateGraph(fullGraphDataRef.current, true);
    }
  }, [focusMode, focusedNodes, focusDepth, updateGraph]);

  // Initialize Sigma
  useEffect(() => {
    if (!containerRef.current) return;

    if (!graphRef.current) {
      graphRef.current = new Graph();
    }

    const sigma = new Sigma(graphRef.current, containerRef.current, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 6,
      labelSize: 14,
      labelWeight: 'bold',
      labelColor: { color: '#f1f5f9' },
      defaultNodeColor: '#666666',
      defaultEdgeColor: '#2a3a4d',
      defaultNodeType: 'circle',
      defaultEdgeType: 'line',
      allowInvalidContainer: true,
      minCameraRatio: 0.02,  // Allow much deeper zoom
      maxCameraRatio: 10,
      hideLabelsOnMove: true,
      hideEdgesOnMove: false,
      labelFont: 'Inter, sans-serif',
      zoomToSizeRatioFunction: (ratio) => ratio,
      itemSizesReference: 'positions',
      zoomDuration: 200,
    });

    sigmaRef.current = sigma;

    // Event handlers
    sigma.on('clickNode', ({ node }) => {
      const nodeData = graphRef.current.getNodeAttributes(node);
      if (onNodeClick && nodeData.nodeData) {
        onNodeClick(nodeData.nodeData);
      }
    });

    sigma.on('doubleClickNode', ({ node }) => {
      const nodeData = graphRef.current.getNodeAttributes(node);
      if (nodeData.nodeData) {
        enterFocusMode(nodeData.nodeData.id);
      }
    });

    sigma.on('enterNode', ({ node, event }) => {
      const nodeData = graphRef.current.getNodeAttributes(node);
      setHoveredNode(nodeData);
      setTooltipPosition({ x: event.x, y: event.y });
      
      if (onNodeHover && nodeData.nodeData) {
        onNodeHover(nodeData.nodeData);
      }

      // Highlight on hover
      graphRef.current.setNodeAttribute(node, 'color', '#ffffff');
      sigma.refresh();
    });

    sigma.on('leaveNode', ({ node }) => {
      setHoveredNode(null);
      
      const nodeData = graphRef.current.getNodeAttributes(node);
      if (nodeData.nodeData) {
        const nodeType = nodeData.nodeData.node_type || 'Individual';
        const isSelected = nodeData.nodeData.id === selectedNodeId;
        const isFocusCenter = nodeData.nodeData.id === focusNodeId;
        graphRef.current.setNodeAttribute(
          node,
          'color',
          isFocusCenter ? '#ffffff' : (isSelected ? '#ffffff' : NODE_COLORS[nodeType] || '#666666')
        );
        sigma.refresh();
      }
    });

    // Cleanup
    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
  }, []);

  // Update graph when data changes
  useEffect(() => {
    if (graphData) {
      console.log('GraphCanvas received data:', {
        nodes: graphData.nodes?.length,
        edges: graphData.edges?.length,
        sampleNode: graphData.nodes?.[0]
      });
      updateGraph(graphData, focusMode);
      
      // Reset camera to show all nodes after data loads (only if not in focus mode)
      if (sigmaRef.current && graphData.nodes?.length > 0 && !focusMode) {
        setTimeout(() => {
          const camera = sigmaRef.current.getCamera();
          camera.animatedReset({ duration: 300 });
        }, 100);
      }
    }
  }, [graphData, updateGraph, focusMode]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      camera.animatedZoom({ duration: 200 });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      camera.animatedUnzoom({ duration: 200 });
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      camera.animatedReset({ duration: 300 });
    }
  }, []);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    if (!hoveredNode || !hoveredNode.nodeData) return null;
    
    const node = hoveredNode.nodeData;
    return (
      <div className="tooltip" style={{ left: tooltipPosition.x + 15, top: tooltipPosition.y + 15 }}>
        <div className="font-semibold text-blob-text">{node.name}</div>
        <div className={`badge badge-${node.node_type?.toLowerCase()}`}>
          {node.node_type}
        </div>
        {node.sector && (
          <div className="text-xs text-blob-text-muted mt-1">{node.sector}</div>
        )}
        {node.skills && node.skills.length > 0 && (
          <div className="text-xs text-blob-text-dim mt-1">
            {node.skills.slice(0, 3).join(', ')}
            {node.skills.length > 3 && ` +${node.skills.length - 3}`}
          </div>
        )}
        <div className="text-xs text-blob-primary mt-2">Double-click to focus</div>
      </div>
    );
  }, [hoveredNode, tooltipPosition]);

  // Stats for display
  const visibleNodeCount = focusMode ? focusedNodes.size : (graphData?.nodes?.length || 0);

  return (
    <div className="graph-container">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-blob-bg/80 z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner" />
            <span className="text-blob-text-muted">Loading graph...</span>
          </div>
        </div>
      )}

      {/* Sigma container */}
      <div ref={containerRef} className="sigma-container" />

      {/* Tooltip */}
      {tooltipContent}

      {/* Focus Mode Controls */}
      {focusMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-4 shadow-glow-md">
            <div className="flex items-center gap-2">
              <Focus size={18} className="text-blob-primary" />
              <span className="text-sm font-medium text-blob-text">Focus Mode</span>
            </div>
            
            <div className="w-px h-6 bg-blob-border" />
            
            {/* Depth selector */}
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-blob-text-muted" />
              <span className="text-xs text-blob-text-muted">Depth:</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDepthChange(d)}
                    className={`w-7 h-7 rounded-lg text-sm font-medium transition-all ${
                      focusDepth === d
                        ? 'bg-blob-primary text-white shadow-glow-sm'
                        : 'bg-blob-card text-blob-text-muted hover:bg-blob-surface'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="w-px h-6 bg-blob-border" />
            
            {/* Node count */}
            <div className="flex items-center gap-2">
              <Users size={14} className="text-blob-text-muted" />
              <span className="text-sm text-blob-text">{focusedNodes.size} nodes</span>
            </div>
            
            <div className="w-px h-6 bg-blob-border" />
            
            {/* Exit button */}
            <button
              onClick={exitFocusMode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
            >
              <X size={14} />
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
        <button onClick={handleZoomIn} className="zoom-btn" title="Zoom In">
          <ZoomIn size={18} />
        </button>
        <button onClick={handleZoomOut} className="zoom-btn" title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <button onClick={handleResetZoom} className="zoom-btn" title="Reset View">
          <Maximize2 size={18} />
        </button>
        {!focusMode && selectedNodeId && (
          <button 
            onClick={() => enterFocusMode(selectedNodeId)} 
            className="zoom-btn bg-blob-primary/20 border-blob-primary/50 text-blob-primary" 
            title="Focus on Selected Node"
          >
            <Focus size={18} />
          </button>
        )}
      </div>

      {/* Zoom level indicator (only when not in focus mode) */}
      {!focusMode && (
        <div className="absolute bottom-6 left-6 glass rounded-lg px-3 py-2 z-10">
          <div className="text-xs text-blob-text-muted mb-1">Zoom Level</div>
          <div className="flex gap-1">
            {[0, 1, 2].map((level) => (
              <div
                key={level}
                className={`w-8 h-1 rounded-full transition-colors ${
                  level <= zoomLevel ? 'bg-blob-primary' : 'bg-blob-border'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-blob-text mt-1">
            {zoomLevel === 0 && 'Coarse (Blobs & Projects)'}
            {zoomLevel === 1 && 'Medium'}
            {zoomLevel === 2 && 'Detail (Individuals)'}
          </div>
        </div>
      )}

      {/* Stats display */}
      {graphData && (
        <div className="absolute top-6 right-6 glass rounded-lg px-4 py-3 z-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="stat-value">{visibleNodeCount.toLocaleString()}</div>
              <div className="stat-label">{focusMode ? 'Focused' : 'Visible'}</div>
            </div>
            <div>
              <div className="stat-value">{graphData.total_nodes?.toLocaleString() || 0}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>
          {graphData.query_time_ms && (
            <div className="text-xs text-blob-text-dim mt-2 text-center">
              {graphData.query_time_ms.toFixed(1)}ms
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-6 left-6 glass rounded-lg px-4 py-3 z-10">
        <div className="text-xs text-blob-text-muted mb-2 uppercase tracking-wider">Node Types</div>
        <div className="space-y-1">
          {Object.entries(NODE_COLORS).slice(0, 4).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-blob-text">{type}</span>
            </div>
          ))}
        </div>
        {!focusMode && (
          <div className="mt-3 pt-2 border-t border-blob-border text-xs text-blob-text-dim">
            Double-click node to focus
          </div>
        )}
      </div>
    </div>
  );
}
