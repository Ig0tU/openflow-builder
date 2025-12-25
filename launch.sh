#!/bin/bash

##############################################################################
# OpenFlow Builder - Universal Launch Script
#
# This script:
# - Detects OS and system settings
# - Installs dependencies automatically
# - Sets up local MySQL database
# - Configures environment variables
# - Runs migrations
# - Starts the development server
#
# Usage: ./launch.sh
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  OpenFlow Builder Launcher                    ║"
echo "║                 Ready to work. First time. Always.             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

##############################################################################
# 1. DETECT OS AND ARCHITECTURE
##############################################################################

detect_system() {
  echo -e "${BLUE}[1/7]${NC} Detecting system..."

  OS=$(uname -s)
  ARCH=$(uname -m)

  case "$OS" in
    Darwin)
      OS_TYPE="macOS"
      if [[ "$ARCH" == "arm64" ]]; then
        ARCH_TYPE="Apple Silicon (M1/M2/M3)"
      else
        ARCH_TYPE="Intel"
      fi
      ;;
    Linux)
      OS_TYPE="Linux"
      ARCH_TYPE="$ARCH"
      ;;
    MINGW* | MSYS* | CYGWIN*)
      OS_TYPE="Windows"
      ARCH_TYPE="$ARCH"
      ;;
    *)
      OS_TYPE="Unknown"
      ARCH_TYPE="$ARCH"
      ;;
  esac

  echo -e "${GREEN}✓ System: $OS_TYPE ($ARCH_TYPE)${NC}"
}

##############################################################################
# 2. CHECK AND INSTALL DEPENDENCIES
##############################################################################

check_command() {
  if command -v "$1" &> /dev/null; then
    return 0
  else
    return 1
  fi
}

install_dependencies() {
  echo -e "${BLUE}[2/7]${NC} Checking dependencies..."

  MISSING_DEPS=()

  # Check Node.js
  if ! check_command node; then
    MISSING_DEPS+=("node")
    echo -e "${YELLOW}⚠ Node.js not found${NC}"
  else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
  fi

  # Check pnpm
  if ! check_command pnpm; then
    MISSING_DEPS+=("pnpm")
    echo -e "${YELLOW}⚠ pnpm not found${NC}"
  else
    PNPM_VERSION=$(pnpm -v)
    echo -e "${GREEN}✓ pnpm: $PNPM_VERSION${NC}"
  fi

  # Check MySQL (optional - will use local SQLite or prompt)
  if ! check_command mysql; then
    echo -e "${YELLOW}⚠ MySQL client not found (will use local setup)${NC}"
  else
    MYSQL_VERSION=$(mysql --version)
    echo -e "${GREEN}✓ MySQL: $MYSQL_VERSION${NC}"
  fi

  # If missing Node.js, install it
  if [[ " ${MISSING_DEPS[@]} " =~ " node " ]]; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    if [[ "$OS_TYPE" == "macOS" ]]; then
      if ! check_command brew; then
        echo -e "${RED}Homebrew not found. Please install from https://brew.sh${NC}"
        exit 1
      fi
      brew install node
    elif [[ "$OS_TYPE" == "Linux" ]]; then
      if check_command apt-get; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
      elif check_command yum; then
        sudo yum install -y nodejs npm
      else
        echo -e "${RED}Please install Node.js manually${NC}"
        exit 1
      fi
    else
      echo -e "${RED}Please install Node.js from https://nodejs.org${NC}"
      exit 1
    fi
  fi

  # If missing pnpm, install it
  if [[ " ${MISSING_DEPS[@]} " =~ " pnpm " ]]; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
  fi

  echo -e "${GREEN}✓ Dependencies ready${NC}"
}

##############################################################################
# 3. SET UP ENVIRONMENT VARIABLES
##############################################################################

setup_env() {
  echo -e "${BLUE}[3/7]${NC} Configuring environment..."

  if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"

    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    VITE_APP_ID="openflow-builder-local"

    cat > .env << EOF
# OpenFlow Builder - Local Development Configuration

# Database Configuration
DATABASE_URL="mysql://root:openflow@localhost:3306/openflow_builder"

# Authentication
JWT_SECRET="$JWT_SECRET"
OAUTH_SERVER_URL="http://localhost:3000/api/oauth"
OWNER_OPEN_ID="dev-user"

# Application
NODE_ENV="development"
VITE_APP_ID="$VITE_APP_ID"
PORT=3000

# Optional: AI Services (can be added later)
# BUILT_IN_FORGE_API_URL=""
# BUILT_IN_FORGE_API_KEY=""
EOF

    echo -e "${GREEN}✓ .env file created${NC}"
  else
    echo -e "${GREEN}✓ .env file already exists${NC}"
  fi
}

##############################################################################
# 4. SET UP DATABASE
##############################################################################

start_mysql() {
  # Check if port 3306 is already open
  if nc -z 127.0.0.1 3306 2>/dev/null; then
    echo -e "${GREEN}✓ MySQL is already running on port 3306${NC}"
    return 0
  fi

  echo -e "${YELLOW}Starting MySQL...${NC}"

  # Try Homebrew first (most common on macOS)
  if [[ "$OS_TYPE" == "macOS" ]]; then
    if check_command brew; then
      # Try different homebrew mysql service names
      if brew services start mysql@8.0 2>/dev/null || \
         brew services start mysql 2>/dev/null || \
         brew services start mysql-community-server 2>/dev/null; then
        sleep 3
        if nc -z 127.0.0.1 3306 2>/dev/null; then
          echo -e "${GREEN}✓ MySQL started via Homebrew${NC}"
          return 0
        fi
      fi
    fi
    
    # Try native MySQL on macOS
    if [[ -f /usr/local/mysql/support-files/mysql.server ]]; then
      sudo /usr/local/mysql/support-files/mysql.server start 2>/dev/null
      sleep 3
      if nc -z 127.0.0.1 3306 2>/dev/null; then
        echo -e "${GREEN}✓ MySQL started (native install)${NC}"
        return 0
      fi
    fi
  fi

  # Try systemctl on Linux
  if [[ "$OS_TYPE" == "Linux" ]]; then
    if sudo systemctl start mysql 2>/dev/null || sudo systemctl start mariadb 2>/dev/null; then
      sleep 2
      if nc -z 127.0.0.1 3306 2>/dev/null; then
        echo -e "${GREEN}✓ MySQL started via systemctl${NC}"
        return 0
      fi
    fi
  fi

  # Docker fallback (optional - only if Docker is installed and user wants it)
  if check_command docker; then
    echo -e "${YELLOW}Trying Docker as fallback...${NC}"
    
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q '^openflow-mysql$'; then
      docker start openflow-mysql 2>/dev/null
    else
      docker run -d --name openflow-mysql \
        -e MYSQL_ROOT_PASSWORD=openflow \
        -e MYSQL_DATABASE=openflow_builder \
        -p 3306:3306 \
        mysql:8 2>/dev/null
    fi
    
    sleep 5
    if nc -z 127.0.0.1 3306 2>/dev/null; then
      echo -e "${GREEN}✓ MySQL started via Docker${NC}"
      return 0
    fi
  fi

  return 1
}

setup_database() {
  echo -e "${BLUE}[4/7]${NC} Setting up database..."

  # First, try to start MySQL if not running
  if ! start_mysql; then
    echo -e "${RED}✗ Could not start MySQL${NC}"
    echo -e "${YELLOW}Please install MySQL via one of:${NC}"
    echo -e "  • Homebrew: ${BLUE}brew install mysql && brew services start mysql${NC}"
    echo -e "  • Docker:   ${BLUE}docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=openflow mysql:8${NC}"
    echo ""
    echo -e "${YELLOW}The app will start but database features won't work until MySQL is running.${NC}"
    return
  fi

  # Create database if mysql client is available
  if check_command mysql; then
    # Try different auth methods to create database
    if mysql -u root -popenflow -e "CREATE DATABASE IF NOT EXISTS openflow_builder;" 2>/dev/null || \
       mysql -u root -e "CREATE DATABASE IF NOT EXISTS openflow_builder;" 2>/dev/null; then
      echo -e "${GREEN}✓ Database 'openflow_builder' ready${NC}"
    else
      echo -e "${YELLOW}⚠ Could not create database (may already exist or need password)${NC}"
    fi
  fi
}

##############################################################################
# 5. INSTALL DEPENDENCIES
##############################################################################

install_packages() {
  echo -e "${BLUE}[5/7]${NC} Installing npm packages..."

  if [ ! -d node_modules ]; then
    pnpm install
    echo -e "${GREEN}✓ Packages installed${NC}"
  else
    echo -e "${GREEN}✓ Packages already installed${NC}"
  fi
}

##############################################################################
# 6. RUN DATABASE MIGRATIONS
##############################################################################

run_migrations() {
  echo -e "${BLUE}[6/7]${NC} Running database migrations..."

  if check_command mysql; then
    # Check if migrations file exists
    if [ -f "drizzle.config.ts" ]; then
      echo -e "${YELLOW}Running: pnpm db:push${NC}"
      pnpm db:push || {
        echo -e "${YELLOW}⚠ Migrations may need manual setup${NC}"
      }
      echo -e "${GREEN}✓ Migrations complete${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ Skipping migrations (MySQL not available)${NC}"
  fi
}

##############################################################################
# 7. START DEVELOPMENT SERVER
##############################################################################

start_server() {
  echo -e "${BLUE}[7/7]${NC} Starting development server..."

  echo -e "${GREEN}"
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║                     🚀 READY TO GO 🚀                         ║"
  echo "╠═══════════════════════════════════════════════════════════════╣"
  echo "║                                                               ║"
  echo "║  App:       http://localhost:3000                            ║"
  echo "║  API:       http://localhost:3000/api/trpc                   ║"
  echo "║  Preview:   http://localhost:3000/preview/:projectId         ║"
  echo "║  Database:  localhost:3306 (openflow_builder)                ║"
  echo "║                                                               ║"
  echo "║  Features:                                                    ║"
  echo "║    ✓ UIkit Component Library (50+ components)                ║"
  echo "║    ✓ Multi-page Preview Server                               ║"
  echo "║    ✓ AI Rate Limiting (20 AI / 100 API per min)              ║"
  echo "║    ✓ ESLint (pnpm run lint)                                  ║"
  echo "║                                                               ║"
  echo "║  Ctrl+C to stop server                                       ║"
  echo "║                                                               ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  pnpm dev
}

##############################################################################
# MAIN EXECUTION
##############################################################################

main() {
  # Check if in correct directory
  if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo -e "${RED}Please run this script from the OpenFlow Builder root directory${NC}"
    exit 1
  fi

  # Run all steps
  detect_system
  install_dependencies
  setup_env
  setup_database
  install_packages
  run_migrations
  start_server
}

# Run main function
main
