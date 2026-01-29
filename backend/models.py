"""
Pydantic models for the Blobs Platform API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from enum import Enum
from datetime import datetime
import uuid


class NodeType(str, Enum):
    INDIVIDUAL = "Individual"
    PROJECT = "Project"
    BLOB = "Blob"
    AGGREGATED = "Aggregated"
    SKILL = "Skill"
    SECTOR = "Sector"


class BlobType(str, Enum):
    COMPANY = "Company"
    INTERNAL = "Internal"
    INDEPENDENT = "Independent"


class ProjectStatus(str, Enum):
    IDEA = "idea"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"
    ABANDONED = "abandoned"


class ProjectType(str, Enum):
    MISSION = "mission"
    RD = "r&d"
    RECRUITMENT = "recruitment"
    EXPLORATION = "exploration"


class EdgeType(str, Enum):
    MEMBER_OF = "member_of"           # Individual -> Blob
    WORKS_ON = "works_on"             # Individual -> Project
    HAS_SKILL = "has_skill"           # Individual -> Skill
    EXECUTES = "executes"             # Blob -> Project
    REQUIRES = "requires"             # Project -> Skill
    COLLABORATES = "collaborates"     # Blob <-> Blob
    CONTAINS = "contains"             # Aggregated -> Blob
    IN_SECTOR = "in_sector"           # Blob/Individual -> Sector
    PEER = "peer"                     # Individual <-> Individual


# ============================================
# Base Node Models
# ============================================

class NodeBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    node_type: NodeType
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Position for visualization
    x: float = 0.0
    y: float = 0.0


class IndividualCreate(BaseModel):
    name: str
    skills: List[str] = []
    availability: bool = True
    location: Optional[str] = None
    sector: Optional[str] = None
    bio: Optional[str] = None


class Individual(NodeBase):
    node_type: NodeType = NodeType.INDIVIDUAL
    skills: List[str] = []
    skill_levels: dict = {}  # skill_name -> proficiency (1-5)
    availability: bool = True
    location: Optional[str] = None
    sector: Optional[str] = None
    bio: Optional[str] = None
    blob_memberships: List[str] = []  # List of blob IDs


class BlobCreate(BaseModel):
    name: str
    blob_type: BlobType
    sector: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    parent_aggregated_id: Optional[str] = None  # For internal blobs


class Blob(NodeBase):
    node_type: NodeType = NodeType.BLOB
    blob_type: BlobType
    sector: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    member_count: int = 0
    parent_aggregated_id: Optional[str] = None


class AggregatedCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sector: Optional[str] = None


class Aggregated(NodeBase):
    """
    Aggregated nodes represent large corporations made of several blobs.
    E.g., Google (Aggregated) contains Google Cloud (Blob), Google AI (Blob), etc.
    """
    node_type: NodeType = NodeType.AGGREGATED
    description: Optional[str] = None
    sector: Optional[str] = None
    child_blob_ids: List[str] = []
    total_member_count: int = 0


class ProjectCreate(BaseModel):
    name: str
    project_type: ProjectType
    status: ProjectStatus = ProjectStatus.IDEA
    description: Optional[str] = None
    required_skills: List[str] = []
    sector: Optional[str] = None
    location: Optional[str] = None


class Project(NodeBase):
    node_type: NodeType = NodeType.PROJECT
    project_type: ProjectType
    status: ProjectStatus = ProjectStatus.IDEA
    description: Optional[str] = None
    required_skills: List[str] = []
    sector: Optional[str] = None
    location: Optional[str] = None
    assigned_blob_ids: List[str] = []
    assigned_individual_ids: List[str] = []


class Skill(NodeBase):
    node_type: NodeType = NodeType.SKILL
    category: Optional[str] = None
    individual_count: int = 0


class Sector(NodeBase):
    node_type: NodeType = NodeType.SECTOR
    description: Optional[str] = None


# ============================================
# Edge Models
# ============================================

class Edge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    target: str
    edge_type: EdgeType
    weight: float = 1.0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EdgeCreate(BaseModel):
    source: str
    target: str
    edge_type: EdgeType
    weight: float = 1.0


# ============================================
# API Response Models
# ============================================

class ViewportRequest(BaseModel):
    center_x: float
    center_y: float
    width: float
    height: float
    zoom_level: int = 1  # 0=coarse, 1=medium, 2=detail
    center_node_id: Optional[str] = None
    max_depth: int = 3


class GraphData(BaseModel):
    nodes: List[dict]
    edges: List[dict]
    total_nodes: int
    total_edges: int
    viewport_nodes: int
    zoom_level: int


class SearchRequest(BaseModel):
    query: Optional[str] = None
    node_types: List[NodeType] = []
    skills: List[str] = []
    availability: Optional[bool] = None
    location: Optional[str] = None
    sector: Optional[str] = None
    min_size: Optional[int] = None
    max_size: Optional[int] = None
    limit: int = 50


class SearchResult(BaseModel):
    nodes: List[dict]
    total_count: int
    query_time_ms: float


class DiscoveryRequest(BaseModel):
    node_id: str
    max_depth: int = 2
    limit: int = 20
    relationship_types: List[EdgeType] = []


class DiscoveryResult(BaseModel):
    source_node: dict
    related_nodes: List[dict]
    paths: List[List[str]]


class NodeCreateResponse(BaseModel):
    success: bool
    node: Optional[dict] = None
    message: str


class NodeDeleteResponse(BaseModel):
    success: bool
    message: str
    deleted_edges: int = 0
