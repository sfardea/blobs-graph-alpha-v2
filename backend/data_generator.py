"""
Data Generator - Creates realistic test data for the Blobs Platform
Generates 10K individuals, major tech companies (as Aggregated/Blobs), 
independent blobs, and projects.
"""
import random
import uuid
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
import math

from models import (
    NodeType, EdgeType, BlobType, ProjectStatus, ProjectType,
    Individual, Blob, Aggregated, Project, Skill, Edge
)
from graph_engine import GraphEngine


# ============================================
# Data Constants
# ============================================

FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Wei", "Yuki", "Mohammed", "Fatima", "Carlos", "Maria", "Pierre", "Sophie",
    "Hans", "Anna", "Giuseppe", "Giulia", "Raj", "Priya", "Chen", "Mei",
    "Alejandro", "Isabella", "Lars", "Emma", "Kenji", "Sakura", "Ali", "Aisha",
    "Olga", "Ivan", "Nina", "Dmitri", "Sven", "Ingrid", "Klaus", "Helga"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
    "Wang", "Tanaka", "Kim", "Singh", "Patel", "Chen", "Yang", "Li", "Zhang",
    "Müller", "Schmidt", "Rossi", "Ferrari", "Dubois", "Bernard", "Larsen", "Johansson",
    "Petrov", "Ivanov", "Smirnov", "Kowalski", "Nowak", "Silva", "Santos", "Ferreira"
]

TECH_SKILLS = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Kotlin", "Swift",
    "Ruby", "PHP", "Scala", "R", "MATLAB", "Julia", "Haskell", "Clojure", "Elixir",
    
    # Frontend
    "React", "Vue.js", "Angular", "Svelte", "Next.js", "HTML/CSS", "Tailwind", "SASS",
    
    # Backend
    "Node.js", "Django", "FastAPI", "Spring Boot", "Express.js", "Flask", "Rails",
    
    # Data & ML
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "PyTorch", "TensorFlow",
    "Pandas", "NumPy", "Scikit-learn", "Data Analysis", "Statistics", "SQL", "NoSQL",
    
    # Cloud & DevOps
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux",
    
    # Databases
    "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Neo4j", "GraphQL",
    
    # Other Tech
    "Blockchain", "IoT", "Embedded Systems", "Mobile Development", "Game Development",
    "Cybersecurity", "Networking", "System Design", "Microservices", "API Design"
]

BUSINESS_SKILLS = [
    "Project Management", "Product Management", "Agile/Scrum", "Leadership",
    "Strategic Planning", "Business Analysis", "Financial Modeling", "Marketing",
    "Sales", "Customer Success", "UX Research", "Design Thinking", "Communication",
    "Negotiation", "Presentation", "Team Building", "Mentoring", "Consulting"
]

SECTORS = [
    "Technology", "Finance", "Healthcare", "Education", "E-commerce", "Media",
    "Energy", "Transportation", "Manufacturing", "Real Estate", "Consulting",
    "Telecommunications", "Aerospace", "Biotechnology", "Gaming", "Cybersecurity"
]

LOCATIONS = [
    "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX", "Boston, MA",
    "Los Angeles, CA", "Chicago, IL", "Denver, CO", "Atlanta, GA", "Miami, FL",
    "London, UK", "Paris, France", "Berlin, Germany", "Amsterdam, Netherlands",
    "Toronto, Canada", "Vancouver, Canada", "Sydney, Australia", "Singapore",
    "Tokyo, Japan", "Seoul, South Korea", "Tel Aviv, Israel", "Bangalore, India",
    "Dublin, Ireland", "Zurich, Switzerland", "Stockholm, Sweden", "Remote"
]

# Major tech companies as Aggregated nodes (they contain multiple Blobs)
MAJOR_COMPANIES = [
    {
        "name": "Google",
        "blobs": ["Google Cloud", "Google AI", "Google Search", "YouTube", "Android"],
        "sector": "Technology",
        "location": "Mountain View, CA"
    },
    {
        "name": "Microsoft",
        "blobs": ["Azure", "Microsoft 365", "LinkedIn", "Xbox", "GitHub"],
        "sector": "Technology",
        "location": "Redmond, WA"
    },
    {
        "name": "Amazon",
        "blobs": ["AWS", "Amazon Retail", "Prime Video", "Alexa", "Ring"],
        "sector": "Technology",
        "location": "Seattle, WA"
    },
    {
        "name": "Apple",
        "blobs": ["iOS Engineering", "Mac Hardware", "Apple Services", "Apple AI/ML"],
        "sector": "Technology",
        "location": "Cupertino, CA"
    },
    {
        "name": "Meta",
        "blobs": ["Facebook", "Instagram", "WhatsApp", "Reality Labs", "Meta AI"],
        "sector": "Technology",
        "location": "Menlo Park, CA"
    },
    {
        "name": "OpenAI",
        "blobs": ["GPT Research", "DALL-E", "ChatGPT Products", "Safety Team"],
        "sector": "Technology",
        "location": "San Francisco, CA"
    },
    {
        "name": "Anthropic",
        "blobs": ["Claude AI", "Safety Research", "Infrastructure", "Product"],
        "sector": "Technology",
        "location": "San Francisco, CA"
    },
    {
        "name": "IBM",
        "blobs": ["IBM Cloud", "Watson", "IBM Research", "IBM Consulting"],
        "sector": "Technology",
        "location": "Armonk, NY"
    },
    {
        "name": "NVIDIA",
        "blobs": ["GPU Hardware", "CUDA/Software", "AI Research", "Automotive"],
        "sector": "Technology",
        "location": "Santa Clara, CA"
    },
    {
        "name": "Tesla",
        "blobs": ["Autopilot", "Energy Products", "Vehicle Engineering", "AI/Robotics"],
        "sector": "Technology",
        "location": "Austin, TX"
    }
]

# Smaller companies (just Blobs, not Aggregated)
SMALLER_COMPANIES = [
    {"name": "Stripe", "sector": "Finance", "location": "San Francisco, CA"},
    {"name": "Databricks", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Snowflake", "sector": "Technology", "location": "Bozeman, MT"},
    {"name": "Cloudflare", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Figma", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Notion", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Airtable", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Vercel", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Supabase", "sector": "Technology", "location": "Remote"},
    {"name": "Linear", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Retool", "sector": "Technology", "location": "San Francisco, CA"},
    {"name": "Plaid", "sector": "Finance", "location": "San Francisco, CA"},
    {"name": "Coinbase", "sector": "Finance", "location": "San Francisco, CA"},
    {"name": "Robinhood", "sector": "Finance", "location": "Menlo Park, CA"},
    {"name": "Square", "sector": "Finance", "location": "San Francisco, CA"},
]

# Independent blobs (teams/collectives)
INDEPENDENT_BLOB_TEMPLATES = [
    "AI Collective", "Data Science Guild", "Full Stack Syndicate", "Cloud Architects",
    "DevOps Alliance", "Security Experts", "Mobile Makers", "Design Systems Team",
    "Open Source Contributors", "Startup Studio", "Tech Consultants United",
    "Innovation Lab", "Research Collective", "Engineering Excellence", "Product Builders"
]

PROJECT_TEMPLATES = [
    {"name": "AI Platform Development", "type": ProjectType.RD, "skills": ["Python", "Machine Learning", "AWS"]},
    {"name": "Mobile App Redesign", "type": ProjectType.MISSION, "skills": ["React", "Mobile Development", "UX Research"]},
    {"name": "Cloud Migration", "type": ProjectType.MISSION, "skills": ["AWS", "Docker", "Kubernetes"]},
    {"name": "Data Pipeline", "type": ProjectType.RD, "skills": ["Python", "SQL", "Data Analysis"]},
    {"name": "Security Audit", "type": ProjectType.MISSION, "skills": ["Cybersecurity", "Linux", "Networking"]},
    {"name": "ML Model Training", "type": ProjectType.RD, "skills": ["PyTorch", "Deep Learning", "Python"]},
    {"name": "API Development", "type": ProjectType.MISSION, "skills": ["Node.js", "API Design", "PostgreSQL"]},
    {"name": "Frontend Modernization", "type": ProjectType.MISSION, "skills": ["React", "TypeScript", "Tailwind"]},
    {"name": "DevOps Automation", "type": ProjectType.RD, "skills": ["Terraform", "CI/CD", "Docker"]},
    {"name": "Blockchain Integration", "type": ProjectType.EXPLORATION, "skills": ["Blockchain", "Rust", "System Design"]},
]


class DataGenerator:
    """Generates realistic test data for the Blobs platform"""
    
    def __init__(self, graph_engine: GraphEngine):
        self.engine = graph_engine
        self.generated_ids = {
            'individuals': [],
            'blobs': [],
            'aggregated': [],
            'projects': [],
            'skills': []
        }
    
    def generate_all(
        self,
        num_individuals: int = 10000,
        num_independent_blobs: int = 50,
        num_projects: int = 200
    ):
        """Generate complete test dataset"""
        print(f"Generating {num_individuals} individuals...")
        
        # 1. Create Skill nodes
        self._generate_skills()
        
        # 2. Create Aggregated nodes (big companies)
        self._generate_aggregated_companies()
        
        # 3. Create Company Blobs (inside Aggregated)
        self._generate_company_blobs()
        
        # 4. Create smaller Company Blobs (standalone)
        self._generate_smaller_companies()
        
        # 5. Create Independent Blobs
        self._generate_independent_blobs(num_independent_blobs)
        
        # 6. Create Individuals
        self._generate_individuals(num_individuals)
        
        # 7. Create Projects
        self._generate_projects(num_projects)
        
        # 8. Create relationships
        self._generate_relationships()
        
        # 9. Compute layout
        print("Computing graph layout...")
        self.engine.compute_layout(scale=1000.0)
        
        print(f"Generation complete!")
        print(f"  - Individuals: {len(self.generated_ids['individuals'])}")
        print(f"  - Blobs: {len(self.generated_ids['blobs'])}")
        print(f"  - Aggregated: {len(self.generated_ids['aggregated'])}")
        print(f"  - Projects: {len(self.generated_ids['projects'])}")
        print(f"  - Total edges: {len(self.engine.edge_data)}")
    
    def _generate_skills(self):
        """Create Skill nodes"""
        all_skills = list(set(TECH_SKILLS + BUSINESS_SKILLS))
        
        for skill_name in all_skills:
            skill_id = str(uuid.uuid4())
            skill_data = {
                'id': skill_id,
                'name': skill_name,
                'node_type': NodeType.SKILL.value,
                'category': 'Technical' if skill_name in TECH_SKILLS else 'Business',
                'individual_count': 0,
                'created_at': datetime.utcnow().isoformat(),
                'x': 0, 'y': 0
            }
            self.engine.add_node(skill_data)
            self.generated_ids['skills'].append(skill_id)
    
    def _generate_aggregated_companies(self):
        """Create Aggregated nodes for major companies"""
        for company in MAJOR_COMPANIES:
            agg_id = str(uuid.uuid4())
            agg_data = {
                'id': agg_id,
                'name': company['name'],
                'node_type': NodeType.AGGREGATED.value,
                'sector': company['sector'],
                'location': company['location'],
                'description': f"{company['name']} - Major technology corporation",
                'child_blob_ids': [],
                'total_member_count': 0,
                'created_at': datetime.utcnow().isoformat(),
                'x': 0, 'y': 0
            }
            self.engine.add_node(agg_data)
            self.generated_ids['aggregated'].append(agg_id)
            
            # Store mapping for later
            company['aggregated_id'] = agg_id
    
    def _generate_company_blobs(self):
        """Create internal Blobs for major companies"""
        for company in MAJOR_COMPANIES:
            agg_id = company['aggregated_id']
            
            for blob_name in company['blobs']:
                blob_id = str(uuid.uuid4())
                blob_data = {
                    'id': blob_id,
                    'name': blob_name,
                    'node_type': NodeType.BLOB.value,
                    'blob_type': BlobType.INTERNAL.value,
                    'sector': company['sector'],
                    'location': company['location'],
                    'description': f"{blob_name} division of {company['name']}",
                    'member_count': 0,
                    'parent_aggregated_id': agg_id,
                    'created_at': datetime.utcnow().isoformat(),
                    'x': 0, 'y': 0
                }
                self.engine.add_node(blob_data)
                self.generated_ids['blobs'].append(blob_id)
                
                # Update aggregated node
                self.engine.node_data[agg_id]['child_blob_ids'].append(blob_id)
                
                # Create CONTAINS edge
                edge_data = {
                    'id': str(uuid.uuid4()),
                    'source': agg_id,
                    'target': blob_id,
                    'edge_type': EdgeType.CONTAINS.value,
                    'weight': 1.0,
                    'created_at': datetime.utcnow().isoformat()
                }
                self.engine.add_edge(edge_data)
    
    def _generate_smaller_companies(self):
        """Create standalone Company Blobs (not part of Aggregated)"""
        for company in SMALLER_COMPANIES:
            blob_id = str(uuid.uuid4())
            blob_data = {
                'id': blob_id,
                'name': company['name'],
                'node_type': NodeType.BLOB.value,
                'blob_type': BlobType.COMPANY.value,
                'sector': company['sector'],
                'location': company['location'],
                'description': f"{company['name']} - Technology company",
                'member_count': 0,
                'parent_aggregated_id': None,
                'created_at': datetime.utcnow().isoformat(),
                'x': 0, 'y': 0
            }
            self.engine.add_node(blob_data)
            self.generated_ids['blobs'].append(blob_id)
    
    def _generate_independent_blobs(self, count: int):
        """Create Independent Blobs (freelancer collectives, teams)"""
        for i in range(count):
            template = random.choice(INDEPENDENT_BLOB_TEMPLATES)
            blob_name = f"{template} #{i+1}"
            
            blob_id = str(uuid.uuid4())
            blob_data = {
                'id': blob_id,
                'name': blob_name,
                'node_type': NodeType.BLOB.value,
                'blob_type': BlobType.INDEPENDENT.value,
                'sector': random.choice(SECTORS),
                'location': random.choice(LOCATIONS),
                'description': f"Independent collective focused on {random.choice(TECH_SKILLS).lower()}",
                'member_count': 0,
                'parent_aggregated_id': None,
                'created_at': datetime.utcnow().isoformat(),
                'x': 0, 'y': 0
            }
            self.engine.add_node(blob_data)
            self.generated_ids['blobs'].append(blob_id)
    
    def _generate_individuals(self, count: int):
        """Generate Individual nodes with skills"""
        for i in range(count):
            if i % 1000 == 0:
                print(f"  Generated {i}/{count} individuals...")
            
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            
            # Generate skills (2-8 skills per person)
            num_skills = random.randint(2, 8)
            # Bias towards tech skills
            tech_count = random.randint(1, min(num_skills, len(TECH_SKILLS)))
            business_count = num_skills - tech_count
            
            skills = random.sample(TECH_SKILLS, tech_count)
            if business_count > 0:
                skills += random.sample(BUSINESS_SKILLS, min(business_count, len(BUSINESS_SKILLS)))
            
            # Skill levels (1-5)
            skill_levels = {skill: random.randint(2, 5) for skill in skills}
            
            ind_id = str(uuid.uuid4())
            ind_data = {
                'id': ind_id,
                'name': f"{first_name} {last_name}",
                'node_type': NodeType.INDIVIDUAL.value,
                'skills': skills,
                'skill_levels': skill_levels,
                'availability': random.random() > 0.3,  # 70% available
                'location': random.choice(LOCATIONS),
                'sector': random.choice(SECTORS),
                'bio': f"Professional with expertise in {', '.join(skills[:3])}",
                'blob_memberships': [],
                'created_at': datetime.utcnow().isoformat(),
                'x': 0, 'y': 0
            }
            self.engine.add_node(ind_data)
            self.generated_ids['individuals'].append(ind_id)
    
    def _generate_projects(self, count: int):
        """Generate Project nodes"""
        statuses = list(ProjectStatus)
        
        for i in range(count):
            template = random.choice(PROJECT_TEMPLATES)
            project_name = f"{template['name']} - Project #{i+1}"
            
            proj_id = str(uuid.uuid4())
            proj_data = {
                'id': proj_id,
                'name': project_name,
                'node_type': NodeType.PROJECT.value,
                'project_type': template['type'].value,
                'status': random.choice(statuses).value,
                'description': f"A {template['type'].value} project requiring {', '.join(template['skills'])}",
                'required_skills': template['skills'],
                'sector': random.choice(SECTORS),
                'location': random.choice(LOCATIONS),
                'assigned_blob_ids': [],
                'assigned_individual_ids': [],
                'created_at': datetime.utcnow().isoformat(),
                'x': 0, 'y': 0
            }
            self.engine.add_node(proj_data)
            self.generated_ids['projects'].append(proj_id)
    
    def _generate_relationships(self):
        """Generate edges between nodes"""
        print("Generating relationships...")
        
        # 1. Assign individuals to blobs (MEMBER_OF)
        self._assign_individuals_to_blobs()
        
        # 2. Assign individuals to projects (WORKS_ON)
        self._assign_individuals_to_projects()
        
        # 3. Assign blobs to projects (EXECUTES)
        self._assign_blobs_to_projects()
        
        # 4. Create peer connections between individuals (PEER)
        self._create_peer_connections()
        
        # 5. Create blob collaborations (COLLABORATES)
        self._create_blob_collaborations()
        
        print(f"  Created {len(self.engine.edge_data)} edges")
    
    def _assign_individuals_to_blobs(self):
        """Assign individuals to blobs"""
        all_blobs = self.generated_ids['blobs']
        
        for ind_id in self.generated_ids['individuals']:
            # Each individual belongs to 1-3 blobs
            num_memberships = random.choices([1, 2, 3], weights=[0.7, 0.2, 0.1])[0]
            selected_blobs = random.sample(all_blobs, min(num_memberships, len(all_blobs)))
            
            for blob_id in selected_blobs:
                # Create MEMBER_OF edge
                edge_data = {
                    'id': str(uuid.uuid4()),
                    'source': ind_id,
                    'target': blob_id,
                    'edge_type': EdgeType.MEMBER_OF.value,
                    'weight': 1.0,
                    'created_at': datetime.utcnow().isoformat()
                }
                self.engine.add_edge(edge_data)
                
                # Update individual's memberships
                self.engine.node_data[ind_id]['blob_memberships'].append(blob_id)
                
                # Update blob's member count
                self.engine.node_data[blob_id]['member_count'] += 1
        
        # Update aggregated member counts
        for agg_id in self.generated_ids['aggregated']:
            total = 0
            for blob_id in self.engine.node_data[agg_id].get('child_blob_ids', []):
                total += self.engine.node_data[blob_id].get('member_count', 0)
            self.engine.node_data[agg_id]['total_member_count'] = total
    
    def _assign_individuals_to_projects(self):
        """Assign individuals to projects based on skill match"""
        for proj_id in self.generated_ids['projects']:
            project = self.engine.node_data[proj_id]
            required_skills = set(project.get('required_skills', []))
            
            # Find individuals with matching skills
            matching_individuals = []
            for ind_id in self.generated_ids['individuals']:
                ind = self.engine.node_data[ind_id]
                ind_skills = set(ind.get('skills', []))
                if ind_skills & required_skills:  # Any overlap
                    matching_individuals.append(ind_id)
            
            # Assign 2-10 individuals per project
            num_assigned = random.randint(2, min(10, len(matching_individuals)))
            assigned = random.sample(matching_individuals, num_assigned) if matching_individuals else []
            
            for ind_id in assigned:
                edge_data = {
                    'id': str(uuid.uuid4()),
                    'source': ind_id,
                    'target': proj_id,
                    'edge_type': EdgeType.WORKS_ON.value,
                    'weight': 1.0,
                    'created_at': datetime.utcnow().isoformat()
                }
                self.engine.add_edge(edge_data)
                self.engine.node_data[proj_id]['assigned_individual_ids'].append(ind_id)
    
    def _assign_blobs_to_projects(self):
        """Assign blobs to execute projects"""
        for proj_id in self.generated_ids['projects']:
            # 1-3 blobs per project
            num_blobs = random.randint(1, 3)
            selected_blobs = random.sample(
                self.generated_ids['blobs'],
                min(num_blobs, len(self.generated_ids['blobs']))
            )
            
            for blob_id in selected_blobs:
                edge_data = {
                    'id': str(uuid.uuid4()),
                    'source': blob_id,
                    'target': proj_id,
                    'edge_type': EdgeType.EXECUTES.value,
                    'weight': 1.0,
                    'created_at': datetime.utcnow().isoformat()
                }
                self.engine.add_edge(edge_data)
                self.engine.node_data[proj_id]['assigned_blob_ids'].append(blob_id)
    
    def _create_peer_connections(self):
        """Create peer-to-peer connections between individuals"""
        # Each individual has 3-15 peer connections
        individuals = self.generated_ids['individuals']
        
        for ind_id in individuals:
            num_peers = random.randint(3, 15)
            # Prefer connections within same blobs
            ind_blobs = set(self.engine.node_data[ind_id].get('blob_memberships', []))
            
            potential_peers = []
            for other_id in individuals:
                if other_id == ind_id:
                    continue
                other_blobs = set(self.engine.node_data[other_id].get('blob_memberships', []))
                # Higher chance if in same blob
                if ind_blobs & other_blobs:
                    potential_peers.extend([other_id] * 3)  # 3x weight
                else:
                    potential_peers.append(other_id)
            
            # Select peers (avoid duplicates)
            selected = set()
            for _ in range(num_peers * 2):  # Try more times to get enough unique
                if len(selected) >= num_peers:
                    break
                peer = random.choice(potential_peers)
                selected.add(peer)
            
            for peer_id in selected:
                # Check if edge already exists
                if self.engine.graph.has_edge(ind_id, peer_id):
                    continue
                
                edge_data = {
                    'id': str(uuid.uuid4()),
                    'source': ind_id,
                    'target': peer_id,
                    'edge_type': EdgeType.PEER.value,
                    'weight': random.uniform(0.5, 1.0),
                    'created_at': datetime.utcnow().isoformat()
                }
                self.engine.add_edge(edge_data)
    
    def _create_blob_collaborations(self):
        """Create collaboration edges between blobs"""
        blobs = self.generated_ids['blobs']
        
        # Create 50-100 blob collaborations
        num_collabs = random.randint(50, 100)
        
        for _ in range(num_collabs):
            blob1, blob2 = random.sample(blobs, 2)
            
            if self.engine.graph.has_edge(blob1, blob2):
                continue
            
            edge_data = {
                'id': str(uuid.uuid4()),
                'source': blob1,
                'target': blob2,
                'edge_type': EdgeType.COLLABORATES.value,
                'weight': random.uniform(0.5, 1.0),
                'created_at': datetime.utcnow().isoformat()
            }
            self.engine.add_edge(edge_data)


def generate_test_data(engine: GraphEngine, num_individuals: int = 10000):
    """Convenience function to generate test data"""
    generator = DataGenerator(engine)
    generator.generate_all(num_individuals=num_individuals)
    return generator.generated_ids
