#!/bin/bash
# Simple startup script for Artist Amp Backend
# Works on macOS and Linux

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Artist Amp Backend Startup${NC}"
echo "============================"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate venv
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install/update dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
pip install -q -r requirements.txt 2>/dev/null || {
    echo -e "${YELLOW}Installing dependencies (this may take a few minutes)...${NC}"
    pip install -r requirements.txt
}

# Start server
echo -e "${GREEN}Starting backend server...${NC}"
echo "Server will be available at http://127.0.0.1:8000"
echo "Documentation available at http://127.0.0.1:8000/docs"
echo ""

python -m uvicorn main:app --host 127.0.0.1 --port 8000
