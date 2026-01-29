# 🔮 Blobs Platform - Alpha

A sophisticated professional networking graph visualization platform built with Python (FastAPI) and React (Sigma.js).

![Blobs Platform](https://img.shields.io/badge/version-0.1.0--alpha-blue)
![Python](https://img.shields.io/badge/python-3.11+-green)
![React](https://img.shields.io/badge/react-18.2-blue)
![License](https://img.shields.io/badge/license-MIT-purple)

## ✨ Features

### Core Functionality
- **10,000+ Nodes**: Auto-generated individuals, companies, blobs, and projects
- **Real-time Graph Visualization**: WebGL-powered rendering with Sigma.js
- **Multi-level Zoom**: Coarse → Medium → Detail views with 3-level connection limit
- **Fast Search**: Search by name, skill, sector, location, or availability
- **Discovery**: Find related and similar nodes with BFS traversal

### Node Types
- 👤 **Individual**: Professionals with skills and availability
- 🏢 **Blob**: Professional collectives (Company, Internal, Independent)
- 🏛️ **Aggregated**: Large corporations containing multiple blobs
- 📁 **Project**: Missions, R&D, recruitment initiatives
- 🏷️ **Skill/Sector**: Competencies and industry domains

### Technical Highlights
- **Latency Optimization**: 3-level connection limit, viewport-based streaming
- **Pre-computed Layouts**: Force-directed layout computed server-side
- **WebSocket Support**: Real-time updates for graph changes
- **Responsive Design**: Works on desktop and tablet

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **npm** or **yarn**

### Option 1: Run Locally (Recommended for Development)

#### 1. Clone and Setup Backend

```bash
# Navigate to backend directory
cd blobs-alpha/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python main.py
```

The backend will start at `http://localhost:8000`

> ⏳ **Note**: First startup takes 30-60 seconds to generate 10,000 nodes and compute the graph layout.

#### 2. Setup Frontend (in a new terminal)

```bash
# Navigate to frontend directory
cd blobs-alpha/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start at `http://localhost:3000`

#### 3. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

---

### Option 2: Docker Compose

```bash
# From the blobs-alpha directory
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📖 Usage Guide

### Navigation
- **Pan**: Click and drag on the canvas
- **Zoom**: Mouse wheel or pinch gesture
- **Select Node**: Click on any node
- **Keyboard Shortcuts**:
  - `⌘K` / `Ctrl+K`: Open search
  - `⌘N` / `Ctrl+N`: Create new node
  - `Escape`: Close panels

### Zoom Levels
| Level | View | Visible Nodes |
|-------|------|---------------|
| 0 (Overview) | Blobs, Aggregated, Projects only | ~200-500 |
| 1 (Medium) | + Some individuals near center | ~500-1500 |
| 2 (Detail) | All types, 3-level connection limit | ~1000-3000 |

### Search Filters
- **Node Type**: Filter by Individual, Blob, Project, etc.
- **Skills**: Filter by technical or business skills
- **Sector**: Technology, Finance, Healthcare, etc.
- **Location**: Geographic filter
- **Availability**: For individuals only

### Creating Nodes
1. Click the **Create** button or press `⌘N`
2. Select node type (Individual, Blob, or Project)
3. Fill in the required fields
4. Click **Create**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React 18 + Vite + Tailwind CSS + Sigma.js (WebGL)             │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │ SearchPanel │  │ NodeEditor  │  │ GraphCanvas (Sigma)   │   │
│  └─────────────┘  └─────────────┘  └───────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST + WebSocket
┌────────────────────────────┴────────────────────────────────────┐
│                         BACKEND                                  │
│  Python 3.11 + FastAPI + NetworkX                               │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │ REST API    │  │ WebSocket   │  │ Graph Engine          │   │
│  │ /api/*      │  │ /ws/graph   │  │ (NetworkX + Indices)  │   │
│  └─────────────┘  └─────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Components
- **main.py**: FastAPI application with REST & WebSocket endpoints
- **graph_engine.py**: NetworkX-based graph operations
- **data_generator.py**: Generates 10K test nodes
- **models.py**: Pydantic schemas for API

### Frontend Components
- **App.jsx**: Main application shell
- **GraphCanvas.jsx**: Sigma.js WebGL visualization
- **SearchPanel.jsx**: Search interface with filters
- **NodeEditor.jsx**: Create/edit nodes
- **NodeDetails.jsx**: Selected node information

---

## 📡 API Reference

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Graph statistics |
| `/api/graph/full` | GET | Full graph data with zoom level |
| `/api/graph/viewport` | POST | Viewport-optimized graph data |
| `/api/nodes/{id}` | GET | Get node by ID |
| `/api/nodes/individual` | POST | Create individual |
| `/api/nodes/blob` | POST | Create blob |
| `/api/nodes/project` | POST | Create project |
| `/api/nodes/{id}` | DELETE | Delete node |
| `/api/search` | POST | Advanced search |
| `/api/search/quick` | GET | Quick text search |
| `/api/discover` | POST | Discover related nodes |
| `/api/discover/similar/{id}` | GET | Find similar nodes |

### WebSocket

Connect to `/ws/graph` for real-time updates:

```javascript
// Request viewport data
ws.send(JSON.stringify({
  type: 'viewport',
  payload: { center_x: 500, center_y: 500, width: 800, height: 600, zoom_level: 1 }
}));

// Focus on a node
ws.send(JSON.stringify({
  type: 'focus_node',
  node_id: 'uuid-here',
  depth: 3
}));
```

---

## 🎨 Design System

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#06b6d4` | Accents, highlights |
| Secondary | `#3b82f6` | Secondary actions |
| Background | `#0a0e17` | Main background |
| Surface | `#111827` | Cards, panels |
| Border | `#2a3a4d` | Borders, dividers |

### Node Colors
| Type | Color |
|------|-------|
| Individual | Cyan `#06b6d4` |
| Blob | Purple `#8b5cf6` |
| Aggregated | Amber `#f59e0b` |
| Project | Emerald `#10b981` |
| Skill | Pink `#ec4899` |

---

## 🔧 Configuration

### Environment Variables

**Backend** (optional):
```bash
# .env
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
```

**Frontend**:
```bash
# .env
VITE_API_URL=http://localhost:8000
```

---

## 📊 Performance

### Benchmarks (10K nodes, M1 MacBook)

| Operation | Time |
|-----------|------|
| Initial data generation | ~30-60s |
| Layout computation | ~5-10s |
| Full graph query (zoom 0) | ~50ms |
| Search query | ~10-30ms |
| Viewport query | ~20-50ms |

### Optimization Strategies
1. **3-level connection limit**: Never traverse more than 3 hops
2. **Zoom-based filtering**: Coarse view shows only Blobs/Projects
3. **Pre-computed layouts**: Layout calculated once at startup
4. **Index structures**: Nodes indexed by type, skill, sector, location

---

## 🛣️ Roadmap

### Phase 1 (Current) ✅
- [x] Core graph infrastructure
- [x] Basic visualization
- [x] CRUD operations
- [x] Search & discovery

### Phase 2 (Planned)
- [ ] Redis caching
- [ ] User authentication
- [ ] Graph persistence (Neo4j)
- [ ] ML-powered recommendations

### Phase 3 (Future)
- [ ] GNN embeddings
- [ ] Autonomous agents
- [ ] Real-time collaboration

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [NetworkX](https://networkx.org/) - Graph algorithms
- [Sigma.js](https://www.sigmajs.org/) - WebGL graph visualization
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

---

<div align="center">
  <strong>Built with 💙 for the future of professional networking</strong>
</div>
