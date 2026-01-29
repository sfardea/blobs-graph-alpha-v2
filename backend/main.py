"""
Blobs Platform - Main FastAPI Application
Provides REST API and WebSocket endpoints for graph operations
"""
import asyncio
import json
import time
import logging
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from models import (
    NodeType, EdgeType, BlobType, ProjectStatus, ProjectType,
    IndividualCreate, BlobCreate, AggregatedCreate, ProjectCreate,
    EdgeCreate, ViewportRequest, SearchRequest, DiscoveryRequest,
    NodeCreateResponse, NodeDeleteResponse, SearchResult, DiscoveryResult
)
from graph_engine import GraphEngine
from data_generator import generate_test_data

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global graph engine instance
graph_engine = GraphEngine()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")

manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    import os
    logger.info("Starting Blobs Platform...")
    
    # Generate data in background after startup
    num_individuals = int(os.environ.get("NUM_INDIVIDUALS", 50))
    
    # Quick startup - generate minimal data
    logger.info(f"Generating {num_individuals} nodes...")
    generate_test_data(graph_engine, num_individuals=num_individuals)
    logger.info("Ready!")
    
    yield
    
    logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Blobs Platform API",
    description="Professional Networking Graph Platform",
    version="0.1.0-alpha",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# REST API Endpoints
# ============================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "platform": "Blobs Alpha"}


@app.get("/api/stats")
async def get_stats():
    """Get graph statistics"""
    return graph_engine.get_stats()


@app.get("/api/bounds")
async def get_bounds():
    """Get graph spatial bounds"""
    return graph_engine.bounds


# --------------------------------------------
# Node CRUD Operations
# --------------------------------------------

@app.post("/api/nodes/individual", response_model=NodeCreateResponse)
async def create_individual(data: IndividualCreate):
    """Create a new Individual node"""
    import uuid
    from datetime import datetime
    
    node_id = str(uuid.uuid4())
    node_data = {
        'id': node_id,
        'name': data.name,
        'node_type': NodeType.INDIVIDUAL.value,
        'skills': data.skills,
        'skill_levels': {s: 3 for s in data.skills},
        'availability': data.availability,
        'location': data.location,
        'sector': data.sector,
        'bio': data.bio,
        'blob_memberships': [],
        'created_at': datetime.utcnow().isoformat(),
        'x': graph_engine.bounds['max_x'] / 2 + (hash(node_id) % 100 - 50),
        'y': graph_engine.bounds['max_y'] / 2 + (hash(node_id) % 100 - 50)
    }
    
    graph_engine.add_node(node_data)
    
    # Broadcast to WebSocket clients
    await manager.broadcast({
        'type': 'node_created',
        'node': node_data
    })
    
    return NodeCreateResponse(success=True, node=node_data, message="Individual created")


@app.post("/api/nodes/blob", response_model=NodeCreateResponse)
async def create_blob(data: BlobCreate):
    """Create a new Blob node"""
    import uuid
    from datetime import datetime
    
    node_id = str(uuid.uuid4())
    node_data = {
        'id': node_id,
        'name': data.name,
        'node_type': NodeType.BLOB.value,
        'blob_type': data.blob_type.value,
        'sector': data.sector,
        'description': data.description,
        'location': data.location,
        'member_count': 0,
        'parent_aggregated_id': data.parent_aggregated_id,
        'created_at': datetime.utcnow().isoformat(),
        'x': graph_engine.bounds['max_x'] / 2 + (hash(node_id) % 100 - 50),
        'y': graph_engine.bounds['max_y'] / 2 + (hash(node_id) % 100 - 50)
    }
    
    graph_engine.add_node(node_data)
    
    await manager.broadcast({
        'type': 'node_created',
        'node': node_data
    })
    
    return NodeCreateResponse(success=True, node=node_data, message="Blob created")


@app.post("/api/nodes/project", response_model=NodeCreateResponse)
async def create_project(data: ProjectCreate):
    """Create a new Project node"""
    import uuid
    from datetime import datetime
    
    node_id = str(uuid.uuid4())
    node_data = {
        'id': node_id,
        'name': data.name,
        'node_type': NodeType.PROJECT.value,
        'project_type': data.project_type.value,
        'status': data.status.value,
        'description': data.description,
        'required_skills': data.required_skills,
        'sector': data.sector,
        'location': data.location,
        'assigned_blob_ids': [],
        'assigned_individual_ids': [],
        'created_at': datetime.utcnow().isoformat(),
        'x': graph_engine.bounds['max_x'] / 2 + (hash(node_id) % 100 - 50),
        'y': graph_engine.bounds['max_y'] / 2 + (hash(node_id) % 100 - 50)
    }
    
    graph_engine.add_node(node_data)
    
    await manager.broadcast({
        'type': 'node_created',
        'node': node_data
    })
    
    return NodeCreateResponse(success=True, node=node_data, message="Project created")


@app.get("/api/nodes/{node_id}")
async def get_node(node_id: str):
    """Get a node by ID"""
    node = graph_engine.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@app.delete("/api/nodes/{node_id}", response_model=NodeDeleteResponse)
async def delete_node(node_id: str):
    """Delete a node and its edges"""
    success, deleted_edges = graph_engine.remove_node(node_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Node not found")
    
    await manager.broadcast({
        'type': 'node_deleted',
        'node_id': node_id
    })
    
    return NodeDeleteResponse(
        success=True,
        message=f"Node deleted with {deleted_edges} edges",
        deleted_edges=deleted_edges
    )


# --------------------------------------------
# Edge Operations
# --------------------------------------------

@app.post("/api/edges")
async def create_edge(data: EdgeCreate):
    """Create an edge between two nodes"""
    import uuid
    from datetime import datetime
    
    # Verify both nodes exist
    if not graph_engine.get_node(data.source):
        raise HTTPException(status_code=404, detail="Source node not found")
    if not graph_engine.get_node(data.target):
        raise HTTPException(status_code=404, detail="Target node not found")
    
    edge_data = {
        'id': str(uuid.uuid4()),
        'source': data.source,
        'target': data.target,
        'edge_type': data.edge_type.value,
        'weight': data.weight,
        'created_at': datetime.utcnow().isoformat()
    }
    
    graph_engine.add_edge(edge_data)
    
    await manager.broadcast({
        'type': 'edge_created',
        'edge': edge_data
    })
    
    return edge_data


# --------------------------------------------
# Viewport / Graph Data
# --------------------------------------------

@app.post("/api/graph/viewport")
async def get_viewport_graph(request: ViewportRequest):
    """
    Get graph data for the current viewport.
    Optimized for latency with 3-level connection limit.
    """
    start_time = time.time()
    
    graph_data = graph_engine.get_viewport_graph(request)
    
    elapsed_ms = (time.time() - start_time) * 1000
    logger.info(f"Viewport query: {graph_data.viewport_nodes} nodes in {elapsed_ms:.2f}ms")
    
    return {
        **graph_data.model_dump(),
        'query_time_ms': elapsed_ms
    }


@app.get("/api/graph/full")
async def get_full_graph(
    zoom_level: int = Query(0, ge=0, le=2),
    limit: int = Query(1000, ge=1, le=5000)
):
    """
    Get full graph data (with limit).
    zoom_level: 0=coarse (Aggregated/Blob/Project only), 1=medium, 2=detail
    """
    start_time = time.time()
    
    nodes = []
    
    if zoom_level == 0:
        # Coarse: Only Aggregated, Blobs, Projects
        for node_type in [NodeType.AGGREGATED, NodeType.BLOB, NodeType.PROJECT]:
            for node_id in graph_engine.nodes_by_type[node_type]:
                if len(nodes) >= limit:
                    break
                nodes.append(graph_engine.node_data[node_id])
    else:
        # Medium/Detail: All nodes up to limit
        for node_id, node in list(graph_engine.node_data.items())[:limit]:
            nodes.append(node)
    
    # Get edges for these nodes
    node_ids = {n['id'] for n in nodes}
    edges = []
    for edge in graph_engine.edge_data.values():
        if edge['source'] in node_ids and edge['target'] in node_ids:
            edges.append(edge)
    
    elapsed_ms = (time.time() - start_time) * 1000
    
    # Debug logging
    if nodes:
        sample_node = nodes[0]
        logger.info(f"Returning {len(nodes)} nodes, {len(edges)} edges. Sample node: {sample_node.get('name')} at ({sample_node.get('x')}, {sample_node.get('y')})")
    else:
        logger.warning("No nodes to return!")
    
    return {
        'nodes': nodes,
        'edges': edges,
        'total_nodes': len(graph_engine.node_data),
        'total_edges': len(graph_engine.edge_data),
        'returned_nodes': len(nodes),
        'viewport_nodes': len(nodes),  # Add this for frontend compatibility
        'returned_edges': len(edges),
        'zoom_level': zoom_level,
        'query_time_ms': elapsed_ms
    }


# --------------------------------------------
# Search
# --------------------------------------------

@app.post("/api/search", response_model=SearchResult)
async def search_nodes(request: SearchRequest):
    """
    Search nodes with multiple criteria.
    Supports: name query, node types, skills, availability, location, sector, size
    """
    start_time = time.time()
    
    results = graph_engine.search(
        query=request.query,
        node_types=request.node_types,
        skills=request.skills,
        availability=request.availability,
        location=request.location,
        sector=request.sector,
        min_size=request.min_size,
        max_size=request.max_size,
        limit=request.limit
    )
    
    elapsed_ms = (time.time() - start_time) * 1000
    
    return SearchResult(
        nodes=results,
        total_count=len(results),
        query_time_ms=elapsed_ms
    )


@app.get("/api/search/quick")
async def quick_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Quick text search across all nodes"""
    start_time = time.time()
    
    results = graph_engine.search(query=q, limit=limit)
    
    elapsed_ms = (time.time() - start_time) * 1000
    
    return {
        'query': q,
        'results': results,
        'count': len(results),
        'query_time_ms': elapsed_ms
    }


# --------------------------------------------
# Discovery
# --------------------------------------------

@app.post("/api/discover", response_model=DiscoveryResult)
async def discover_related(request: DiscoveryRequest):
    """
    Discover nodes related to a given node.
    Uses BFS traversal with configurable depth.
    """
    source_node, related_nodes, paths = graph_engine.discover_related(
        node_id=request.node_id,
        max_depth=request.max_depth,
        limit=request.limit,
        relationship_types=request.relationship_types
    )
    
    if source_node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return DiscoveryResult(
        source_node=source_node,
        related_nodes=related_nodes,
        paths=paths
    )


@app.get("/api/discover/similar/{node_id}")
async def get_similar_nodes(node_id: str, limit: int = Query(10, ge=1, le=50)):
    """Find nodes similar to the given node based on attributes"""
    similar = graph_engine.get_similar_nodes(node_id, limit=limit)
    
    if not similar and node_id not in graph_engine.node_data:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return {
        'source_node_id': node_id,
        'similar_nodes': similar
    }


@app.get("/api/discover/neighbors/{node_id}")
async def get_neighbors(
    node_id: str,
    depth: int = Query(1, ge=1, le=3)
):
    """Get neighbors up to specified depth (max 3 for latency)"""
    if node_id not in graph_engine.node_data:
        raise HTTPException(status_code=404, detail="Node not found")
    
    neighbor_ids = graph_engine._get_neighbors_bfs(node_id, max_depth=depth)
    neighbors = [graph_engine.node_data[nid] for nid in neighbor_ids if nid in graph_engine.node_data]
    
    return {
        'center_node_id': node_id,
        'depth': depth,
        'neighbors': neighbors,
        'count': len(neighbors)
    }


# ============================================
# WebSocket Endpoint
# ============================================

@app.websocket("/ws/graph")
async def websocket_graph(websocket: WebSocket):
    """
    WebSocket endpoint for real-time graph updates.
    Handles viewport changes, zoom, and pan operations.
    """
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get('type')
            
            if message_type == 'viewport':
                # Client is requesting viewport update
                request = ViewportRequest(**data.get('payload', {}))
                graph_data = graph_engine.get_viewport_graph(request)
                
                await websocket.send_json({
                    'type': 'viewport_data',
                    'payload': graph_data.model_dump()
                })
            
            elif message_type == 'focus_node':
                # Client wants to focus on a specific node
                node_id = data.get('node_id')
                depth = data.get('depth', 3)
                
                if node_id in graph_engine.node_data:
                    node = graph_engine.node_data[node_id]
                    neighbor_ids = graph_engine._get_neighbors_bfs(node_id, max_depth=depth)
                    
                    nodes = [graph_engine.node_data[nid] for nid in neighbor_ids]
                    
                    # Get edges
                    edges = []
                    for edge in graph_engine.edge_data.values():
                        if edge['source'] in neighbor_ids and edge['target'] in neighbor_ids:
                            edges.append(edge)
                    
                    await websocket.send_json({
                        'type': 'focus_data',
                        'payload': {
                            'center_node': node,
                            'nodes': nodes,
                            'edges': edges
                        }
                    })
            
            elif message_type == 'ping':
                await websocket.send_json({'type': 'pong'})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    reload_mode = os.environ.get("RAILWAY_ENVIRONMENT") is None  # Only reload in dev
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload_mode,
        log_level="info"
    )
