#!/bin/bash

# Blobs Platform - Startup Script
# This script starts both backend and frontend servers

set -e

echo "🔮 Starting Blobs Platform..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed.${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed.${NC}"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${CYAN}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${CYAN}📦 Setting up backend...${NC}"
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo -e "${CYAN}🚀 Starting backend server...${NC}"
echo ""

python main.py &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to initialize (generating 10K nodes)..."
sleep 5

# Check if backend is running
for i in {1..60}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running at http://localhost:8000${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        exit 1
    fi
    sleep 1
done

echo ""

# Start Frontend
echo -e "${CYAN}📦 Setting up frontend...${NC}"
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
fi

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo -e "${CYAN}🚀 Starting frontend server...${NC}"
echo ""

npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✨ Blobs Platform is running!${NC}"
echo ""
echo -e "  Frontend:  ${CYAN}http://localhost:3000${NC}"
echo -e "  Backend:   ${CYAN}http://localhost:8000${NC}"
echo -e "  API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Wait for both processes
wait
