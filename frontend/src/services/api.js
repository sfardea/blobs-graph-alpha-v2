/**
 * API Service - Handles all communication with the backend
 */

const API_BASE = '/api';

class ApiService {
  /**
   * Make a fetch request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============================================
  // Graph Data
  // ============================================

  /**
   * Get graph statistics
   */
  async getStats() {
    return this.request('/stats');
  }

  /**
   * Get graph bounds
   */
  async getBounds() {
    return this.request('/bounds');
  }

  /**
   * Get full graph data with zoom level
   */
  async getFullGraph(zoomLevel = 0, limit = 1000) {
    return this.request(`/graph/full?zoom_level=${zoomLevel}&limit=${limit}`);
  }

  /**
   * Get viewport-optimized graph data
   */
  async getViewportGraph(viewport) {
    return this.request('/graph/viewport', {
      method: 'POST',
      body: viewport,
    });
  }

  // ============================================
  // Node Operations
  // ============================================

  /**
   * Get a single node by ID
   */
  async getNode(nodeId) {
    return this.request(`/nodes/${nodeId}`);
  }

  /**
   * Create an individual
   */
  async createIndividual(data) {
    return this.request('/nodes/individual', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Create a blob
   */
  async createBlob(data) {
    return this.request('/nodes/blob', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Create a project
   */
  async createProject(data) {
    return this.request('/nodes/project', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Delete a node
   */
  async deleteNode(nodeId) {
    return this.request(`/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Edge Operations
  // ============================================

  /**
   * Create an edge
   */
  async createEdge(data) {
    return this.request('/edges', {
      method: 'POST',
      body: data,
    });
  }

  // ============================================
  // Search
  // ============================================

  /**
   * Quick text search
   */
  async quickSearch(query, limit = 20) {
    return this.request(`/search/quick?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  /**
   * Advanced search with filters
   */
  async search(filters) {
    return this.request('/search', {
      method: 'POST',
      body: filters,
    });
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover related nodes
   */
  async discoverRelated(nodeId, maxDepth = 2, limit = 20) {
    return this.request('/discover', {
      method: 'POST',
      body: {
        node_id: nodeId,
        max_depth: maxDepth,
        limit: limit,
      },
    });
  }

  /**
   * Find similar nodes
   */
  async findSimilar(nodeId, limit = 10) {
    return this.request(`/discover/similar/${nodeId}?limit=${limit}`);
  }

  /**
   * Get neighbors up to depth
   */
  async getNeighbors(nodeId, depth = 2) {
    return this.request(`/discover/neighbors/${nodeId}?depth=${depth}`);
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
