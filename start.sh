#!/bin/bash

# AI Construction Bid Analyzer - Start Script
# This script sets up and starts the entire application

set -e

echo "=========================================="
echo "  🏗️  AI Construction Bid Analyzer"
echo "  Starting Application..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${RED}✗ .env file not found! Please create one.${NC}"
    exit 1
fi

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}  Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Clean up used ports
echo ""
echo -e "${BLUE}📡 Cleaning up ports...${NC}"
kill_port 3000
kill_port 3001
echo -e "${GREEN}✓ Ports 3000 and 3001 are free${NC}"

# Check if PostgreSQL is running
echo ""
echo -e "${BLUE}🐘 Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
    if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL doesn't seem to be running. Attempting to start...${NC}"
        if command -v brew &> /dev/null; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
            sleep 2
        fi
        if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} > /dev/null 2>&1; then
            echo -e "${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ PostgreSQL started${NC}"
    fi
else
    echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Create database if it doesn't exist
echo ""
echo -e "${BLUE}🗄️  Setting up database...${NC}"
PGPASSWORD=${DB_PASSWORD} createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-construction_bid_analyzer} 2>/dev/null || echo -e "${YELLOW}  Database already exists (OK)${NC}"
echo -e "${GREEN}✓ Database ready${NC}"

# Install backend dependencies
echo ""
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
npm install --silent 2>/dev/null
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install frontend dependencies
echo ""
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd client && npm install --silent 2>/dev/null && cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Seed the database
echo ""
echo -e "${BLUE}🌱 Seeding database with sample data...${NC}"
node server/seed.js
echo -e "${GREEN}✓ Database seeded successfully${NC}"

# Start the application with hot reload
echo ""
echo "=========================================="
echo -e "${GREEN}  🚀 Starting Application${NC}"
echo -e "${GREEN}  Backend:  http://localhost:3001${NC}"
echo -e "${GREEN}  Frontend: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}  Login: admin@constructionbid.com / admin123${NC}"
echo -e "${YELLOW}  Use 'Quick Login' button for demo access${NC}"
echo "=========================================="
echo ""

# Start both backend (with nodemon for hot reload) and frontend (with react-scripts which auto-reloads)
npm run dev
