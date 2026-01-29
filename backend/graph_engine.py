"""
Graph Engine - Core graph operations using NetworkX
Handles node/edge management, layout computation, and graph algorithms
"""
import networkx as nx
import numpy as np
from typing import Dict, List, Optional, Set, Tuple, Any
from collections import defaultdict
import json
from datetime import datetime
import logging

from models import (
    NodeType, EdgeType, BlobType, ProjectStatus, ProjectType,
    Individual, Blob, Aggregated, Project, Skill, Sector,
    Edge, ViewportRequest, GraphData
)

logger = logging.getLogger(__name__)


class GraphEngine:
    def __init__(self):
        self.graph = nx.Graph()
        self.node_data: Dict[str, dict] = {}
        self.edge_data: Dict[str, dict] = {}
        
        # Pre-computed layouts at different zoom levels
        self.layouts: Dict[int, Dict[str, Tuple[float, float]]] = {}
        
        # Index structures for fast queries
        self.nodes_by_type: Dict[NodeType, Set[str]] = defaultdict(set)
        self.nodes_by_skill: Dict[str, Set[str]] = defaultdict(set)
        self.nodes_by_sector: Dict[str, Set[str]] = defaultdict(set)
        self.nodes_by_location: Dict[str, Set[str]] = defaultdict(set)
        
        # Spatial index bounds
        self.bounds = {'min_x': 0, 'max_x': 1000, 'min_y': 0, 'max_y': 1000}
        
    # ============================================
    # Node Operations
    # ============================================
    
    def add_node(self, node_data: dict) -> str:
        """Add a node to the graph"""
        node_id = node_data.get('id')
        node_type = NodeType(node_data.get('node_type'))
        
        # Add to NetworkX graph
        self.graph.add_node(node_id)
        
        # Store full node data
        self.node_data[node_id] = node_data
        
        # Update indices
        self.nodes_by_type[node_type].add(node_id)
        
        if 'skills' in node_data:
            for skill in node_data['skills']:
                self.nodes_by_skill[skill.lower()].add(node_id)
        
        if 'sector' in node_data and node_data['sector']:
            self.nodes_by_sector[node_data['sector'].lower()].add(node_id)
            
        if 'location' in node_data and node_data['location']:
            self.nodes_by_location[node_data['location'].lower()].add(node_id)
        
        return node_id
    
    def remove_node(self, node_id: str) -> Tuple[bool, int]:
        """Remove a node and all its edges. Returns (success, deleted_edge_count)"""
        if node_id not in self.node_data:
            return False, 0
        
        node_data = self.node_data[node_id]
        node_type = NodeType(node_data.get('node_type'))
        
        # Count edges to be removed
        edge_count = self.graph.degree(node_id)
        
        # Remove from indices
        self.nodes_by_type[node_type].discard(node_id)
        
        if 'skills' in node_data:
            for skill in node_data['skills']:
                self.nodes_by_skill[skill.lower()].discard(node_id)
        
        if 'sector' in node_data and node_data['sector']:
            self.nodes_by_sector[node_data['sector'].lower()].discard(node_id)
            
        if 'location' in node_data and node_data['location']:
            self.nodes_by_location[node_data['location'].lower()].discard(node_id)
        
        # Remove edges from edge_data
        edges_to_remove = []
        for edge_id, edge in self.edge_data.items():
            if edge['source'] == node_id or edge['target'] == node_id:
                edges_to_remove.append(edge_id)
        
        for edge_id in edges_to_remove:
            del self.edge_data[edge_id]
        
        # Remove from NetworkX
        self.graph.remove_node(node_id)
        
        # Remove from node_data
        del self.node_data[node_id]
        
        return True, edge_count
    
    def get_node(self, node_id: str) -> Optional[dict]:
        """Get node data by ID"""
        return self.node_data.get(node_id)
    
    def update_node(self, node_id: str, updates: dict) -> bool:
        """Update node data"""
        if node_id not in self.node_data:
            return False
        
        # Handle index updates for skills, sector, location
        old_data = self.node_data[node_id]
        
        # Update skills index
        if 'skills' in updates:
            old_skills = set(old_data.get('skills', []))
            new_skills = set(updates['skills'])
            
            for skill in old_skills - new_skills:
                self.nodes_by_skill[skill.lower()].discard(node_id)
            for skill in new_skills - old_skills:
                self.nodes_by_skill[skill.lower()].add(node_id)
        
        # Update sector index
        if 'sector' in updates:
            if old_data.get('sector'):
                self.nodes_by_sector[old_data['sector'].lower()].discard(node_id)
            if updates['sector']:
                self.nodes_by_sector[updates['sector'].lower()].add(node_id)
        
        # Update location index
        if 'location' in updates:
            if old_data.get('location'):
                self.nodes_by_location[old_data['location'].lower()].discard(node_id)
            if updates['location']:
                self.nodes_by_location[updates['location'].lower()].add(node_id)
        
        # Apply updates
        self.node_data[node_id].update(updates)
        return True
    
    # ============================================
    # Edge Operations
    # ============================================
    
    def add_edge(self, edge_data: dict) -> str:
        """Add an edge to the graph"""
        edge_id = edge_data.get('id')
        source = edge_data['source']
        target = edge_data['target']
        weight = edge_data.get('weight', 1.0)
        
        # Add to NetworkX
        self.graph.add_edge(source, target, weight=weight, edge_id=edge_id)
        
        # Store edge data
        self.edge_data[edge_id] = edge_data
        
        return edge_id
    
    def remove_edge(self, edge_id: str) -> bool:
        """Remove an edge by ID"""
        if edge_id not in self.edge_data:
            return False
        
        edge = self.edge_data[edge_id]
        source, target = edge['source'], edge['target']
        
        if self.graph.has_edge(source, target):
            self.graph.remove_edge(source, target)
        
        del self.edge_data[edge_id]
        return True
    
    # ============================================
    # Layout Computation
    # ============================================
    
    def compute_layout(self, scale: float = 500.0) -> Dict[str, Tuple[float, float]]:
        """Compute node positions using force-directed layout"""
        if len(self.graph.nodes) == 0:
            return {}
        
        logger.info(f"Computing layout for {len(self.graph.nodes)} nodes...")
        
        # Use spring layout with optimizations for large graphs
        if len(self.graph.nodes) > 5000:
            # For large graphs, use faster algorithm with fewer iterations
            pos = nx.spring_layout(
                self.graph, 
                k=2.0/np.sqrt(len(self.graph.nodes)),
                iterations=50,
                scale=scale,
                center=(scale/2, scale/2)
            )
        else:
            pos = nx.spring_layout(
                self.graph,
                k=1.5/np.sqrt(len(self.graph.nodes)) if len(self.graph.nodes) > 0 else 1,
                iterations=100,
                scale=scale,
                center=(scale/2, scale/2)
            )
        
        # Convert to dict and update node data
        layout = {}
        for node_id, (x, y) in pos.items():
            layout[node_id] = (float(x), float(y))
            if node_id in self.node_data:
                self.node_data[node_id]['x'] = float(x)
                self.node_data[node_id]['y'] = float(y)
        
        # Update bounds
        if layout:
            xs = [p[0] for p in layout.values()]
            ys = [p[1] for p in layout.values()]
            self.bounds = {
                'min_x': min(xs) - 50,
                'max_x': max(xs) + 50,
                'min_y': min(ys) - 50,
                'max_y': max(ys) + 50
            }
        
        self.layouts[1] = layout  # Store as default zoom level
        logger.info("Layout computation complete")
        
        return layout
    
    def compute_hierarchical_layouts(self):
        """Compute layouts for different zoom levels"""
        # Level 0: Coarse - only Aggregated, Blobs, Projects
        coarse_nodes = (
            self.nodes_by_type[NodeType.AGGREGATED] |
            self.nodes_by_type[NodeType.BLOB] |
            self.nodes_by_type[NodeType.PROJECT]
        )
        
        if coarse_nodes:
            subgraph = self.graph.subgraph(coarse_nodes)
            if len(subgraph.nodes) > 0:
                pos = nx.spring_layout(subgraph, scale=500, center=(250, 250))
                self.layouts[0] = {n: (float(p[0]), float(p[1])) for n, p in pos.items()}
        
        # Level 1 and 2 use the full layout
        self.layouts[1] = self.layouts.get(1, {})
        self.layouts[2] = self.layouts.get(1, {})
    
    # ============================================
    # Viewport and Zoom Operations
    # ============================================
    
    def get_viewport_graph(self, request: ViewportRequest) -> GraphData:
        """
        Get nodes and edges visible in the current viewport.
        Implements 3-level connection limit for latency optimization.
        """
        zoom_level = request.zoom_level
        max_depth = min(request.max_depth, 3)  # Never exceed 3 levels
        
        visible_nodes = set()
        
        # Determine which node types are visible at this zoom level
        if zoom_level == 0:
            # Coarse: Only Aggregated, Blobs, Projects
            type_filter = {NodeType.AGGREGATED, NodeType.BLOB, NodeType.PROJECT}
            for node_type in type_filter:
                visible_nodes.update(self.nodes_by_type[node_type])
        
        elif zoom_level == 1:
            # Medium: Aggregated, Blobs, Projects + some Individuals if centered
            type_filter = {NodeType.AGGREGATED, NodeType.BLOB, NodeType.PROJECT}
            for node_type in type_filter:
                visible_nodes.update(self.nodes_by_type[node_type])
            
            # If centered on a node, add nearby individuals
            if request.center_node_id:
                nearby = self._get_neighbors_bfs(request.center_node_id, max_depth=2)
                individuals = nearby & self.nodes_by_type[NodeType.INDIVIDUAL]
                # Limit to 200 individuals at medium zoom
                visible_nodes.update(list(individuals)[:200])
        
        else:
            # Detail (zoom_level >= 2): All types, but limited by 3-level BFS
            if request.center_node_id:
                visible_nodes = self._get_neighbors_bfs(request.center_node_id, max_depth=max_depth)
            else:
                # No center node - get nodes in viewport bounds
                visible_nodes = self._get_nodes_in_bounds(
                    request.center_x - request.width/2,
                    request.center_x + request.width/2,
                    request.center_y - request.height/2,
                    request.center_y + request.height/2
                )
                # Limit to 2000 nodes for performance
                if len(visible_nodes) > 2000:
                    visible_nodes = set(list(visible_nodes)[:2000])
        
        # Get edges between visible nodes
        visible_edges = []
        edge_set = set()
        
        for edge_id, edge in self.edge_data.items():
            source, target = edge['source'], edge['target']
            if source in visible_nodes and target in visible_nodes:
                if (source, target) not in edge_set and (target, source) not in edge_set:
                    visible_edges.append(edge)
                    edge_set.add((source, target))
        
        # Prepare node data for response
        nodes_data = []
        for node_id in visible_nodes:
            if node_id in self.node_data:
                node = self.node_data[node_id].copy()
                # Ensure position is set
                if node_id in self.layouts.get(1, {}):
                    node['x'], node['y'] = self.layouts[1][node_id]
                nodes_data.append(node)
        
        return GraphData(
            nodes=nodes_data,
            edges=visible_edges,
            total_nodes=len(self.node_data),
            total_edges=len(self.edge_data),
            viewport_nodes=len(visible_nodes),
            zoom_level=zoom_level
        )
    
    def _get_neighbors_bfs(self, center_id: str, max_depth: int = 3) -> Set[str]:
        """BFS traversal limited to max_depth levels"""
        if center_id not in self.graph:
            return set()
        
        visited = {center_id}
        current_level = {center_id}
        
        for depth in range(max_depth):
            next_level = set()
            for node in current_level:
                for neighbor in self.graph.neighbors(node):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_level.add(neighbor)
            current_level = next_level
            
            if not current_level:
                break
        
        return visited
    
    def _get_nodes_in_bounds(self, min_x: float, max_x: float, 
                              min_y: float, max_y: float) -> Set[str]:
        """Get nodes within spatial bounds"""
        result = set()
        for node_id, node in self.node_data.items():
            x, y = node.get('x', 0), node.get('y', 0)
            if min_x <= x <= max_x and min_y <= y <= max_y:
                result.add(node_id)
        return result
    
    # ============================================
    # Search Operations
    # ============================================
    
    def search(
        self,
        query: Optional[str] = None,
        node_types: List[NodeType] = None,
        skills: List[str] = None,
        availability: Optional[bool] = None,
        location: Optional[str] = None,
        sector: Optional[str] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        limit: int = 50
    ) -> List[dict]:
        """
        Search nodes with multiple criteria.
        Returns list of matching nodes.
        """
        candidates = set(self.node_data.keys())
        
        # Filter by node types
        if node_types:
            type_matches = set()
            for nt in node_types:
                type_matches.update(self.nodes_by_type[nt])
            candidates &= type_matches
        
        # Filter by skills (OR logic - any skill matches)
        if skills:
            skill_matches = set()
            for skill in skills:
                skill_matches.update(self.nodes_by_skill.get(skill.lower(), set()))
            candidates &= skill_matches
        
        # Filter by sector
        if sector:
            candidates &= self.nodes_by_sector.get(sector.lower(), set())
        
        # Filter by location
        if location:
            location_matches = set()
            location_lower = location.lower()
            for loc_key, node_ids in self.nodes_by_location.items():
                if location_lower in loc_key:
                    location_matches.update(node_ids)
            candidates &= location_matches
        
        # Filter remaining criteria
        results = []
        for node_id in candidates:
            node = self.node_data[node_id]
            
            # Text query search (name, description, bio)
            if query:
                query_lower = query.lower()
                searchable = ' '.join([
                    node.get('name', ''),
                    node.get('description', ''),
                    node.get('bio', ''),
                    ' '.join(node.get('skills', []))
                ]).lower()
                if query_lower not in searchable:
                    continue
            
            # Availability filter (for individuals)
            if availability is not None:
                if node.get('node_type') == NodeType.INDIVIDUAL:
                    if node.get('availability') != availability:
                        continue
            
            # Size filters (for blobs/aggregated)
            if min_size is not None:
                size = node.get('member_count', node.get('total_member_count', 0))
                if size < min_size:
                    continue
            
            if max_size is not None:
                size = node.get('member_count', node.get('total_member_count', 0))
                if size > max_size:
                    continue
            
            results.append(node)
            
            if len(results) >= limit:
                break
        
        return results
    
    # ============================================
    # Discovery Operations
    # ============================================
    
    def discover_related(
        self,
        node_id: str,
        max_depth: int = 2,
        limit: int = 20,
        relationship_types: List[EdgeType] = None
    ) -> Tuple[Optional[dict], List[dict], List[List[str]]]:
        """
        Discover nodes related to a given node.
        Returns: (source_node, related_nodes, paths)
        """
        if node_id not in self.node_data:
            return None, [], []
        
        source_node = self.node_data[node_id]
        
        # BFS to find related nodes
        visited = {node_id}
        queue = [(node_id, [node_id])]
        related = []
        paths = []
        
        while queue and len(related) < limit:
            current_id, path = queue.pop(0)
            
            if len(path) > max_depth + 1:
                continue
            
            for neighbor_id in self.graph.neighbors(current_id):
                if neighbor_id in visited:
                    continue
                
                # Check relationship type filter
                if relationship_types:
                    edge_match = False
                    for edge in self.edge_data.values():
                        if ((edge['source'] == current_id and edge['target'] == neighbor_id) or
                            (edge['source'] == neighbor_id and edge['target'] == current_id)):
                            if EdgeType(edge['edge_type']) in relationship_types:
                                edge_match = True
                                break
                    if not edge_match:
                        continue
                
                visited.add(neighbor_id)
                new_path = path + [neighbor_id]
                
                if neighbor_id in self.node_data:
                    related.append(self.node_data[neighbor_id])
                    paths.append(new_path)
                
                queue.append((neighbor_id, new_path))
        
        return source_node, related[:limit], paths[:limit]
    
    def get_similar_nodes(self, node_id: str, limit: int = 10) -> List[dict]:
        """Find nodes similar to the given node based on attributes"""
        if node_id not in self.node_data:
            return []
        
        source = self.node_data[node_id]
        source_type = source.get('node_type')
        source_skills = set(source.get('skills', []))
        source_sector = source.get('sector', '').lower()
        
        scored = []
        
        for nid, node in self.node_data.items():
            if nid == node_id:
                continue
            
            # Same type gets base score
            if node.get('node_type') != source_type:
                continue
            
            score = 0.0
            
            # Skill overlap
            node_skills = set(node.get('skills', []))
            if source_skills and node_skills:
                overlap = len(source_skills & node_skills)
                score += overlap * 2.0
            
            # Same sector
            if source_sector and node.get('sector', '').lower() == source_sector:
                score += 3.0
            
            # Same location
            if source.get('location') and source.get('location') == node.get('location'):
                score += 1.0
            
            if score > 0:
                scored.append((score, node))
        
        # Sort by score descending
        scored.sort(key=lambda x: -x[0])
        
        return [node for _, node in scored[:limit]]
    
    # ============================================
    # Statistics
    # ============================================
    
    def get_stats(self) -> dict:
        """Get graph statistics"""
        return {
            'total_nodes': len(self.node_data),
            'total_edges': len(self.edge_data),
            'nodes_by_type': {
                nt.value: len(nodes) for nt, nodes in self.nodes_by_type.items()
            },
            'bounds': self.bounds,
            'connected_components': nx.number_connected_components(self.graph) if len(self.graph) > 0 else 0
        }
    
    # ============================================
    # Serialization
    # ============================================
    
    def to_dict(self) -> dict:
        """Serialize graph to dictionary"""
        return {
            'nodes': list(self.node_data.values()),
            'edges': list(self.edge_data.values()),
            'layouts': {k: {nid: list(pos) for nid, pos in v.items()} 
                       for k, v in self.layouts.items()},
            'bounds': self.bounds
        }
    
    def from_dict(self, data: dict):
        """Load graph from dictionary"""
        self.graph.clear()
        self.node_data.clear()
        self.edge_data.clear()
        self.nodes_by_type.clear()
        self.nodes_by_skill.clear()
        self.nodes_by_sector.clear()
        self.nodes_by_location.clear()
        
        # Load nodes
        for node in data.get('nodes', []):
            self.add_node(node)
        
        # Load edges
        for edge in data.get('edges', []):
            self.add_edge(edge)
        
        # Load layouts
        if 'layouts' in data:
            self.layouts = {
                int(k): {nid: tuple(pos) for nid, pos in v.items()}
                for k, v in data['layouts'].items()
            }
        
        # Load bounds
        if 'bounds' in data:
            self.bounds = data['bounds']
