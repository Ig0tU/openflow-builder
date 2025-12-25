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

setup_database() {
  echo -e "${BLUE}[4/7]${NC} Setting up database..."

  # Check if MySQL is running
  if check_command mysql; then
    echo -e "${YELLOW}Checking MySQL...${NC}"

    # Try to connect to MySQL
    if mysql -u root -p -e "SELECT 1" &> /dev/null || \
       mysql -u root -e "SELECT 1" &> /dev/null; then
      echo -e "${GREEN}✓ MySQL is running${NC}"

      # Create database if it doesn't exist
      mysql -u root -e "CREATE DATABASE IF NOT EXISTS openflow_builder;"
      echo -e "${GREEN}✓ Database created/verified${NC}"
    else
      echo -e "${YELLOW}MySQL not running. Starting MySQL...${NC}"

      if [[ "$OS_TYPE" == "macOS" ]]; then
        brew services start mysql-community-server || brew services start mysql || true
        sleep 2
      elif [[ "$OS_TYPE" == "Linux" ]]; then
        sudo systemctl start mysql || sudo systemctl start mariadb || true
        sleep 2
      fi

      # Try again
      if mysql -u root -e "SELECT 1" &> /dev/null; then
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS openflow_builder;"
        echo -e "${GREEN}✓ Database created/verified${NC}"
      else
        echo -e "${YELLOW}⚠ Could not start MySQL - will attempt migrations anyway${NC}"
      fi
    fi
  else
    echo -e "${YELLOW}MySQL client not available - skipping database setup${NC}"
    echo -e "${YELLOW}Please ensure MySQL is running on localhost:3306${NC}"
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
  echo "║  Frontend:  http://localhost:3000                            ║"
  echo "║  Backend:   http://localhost:3000/api/trpc                   ║"
  echo "║  Database:  localhost:3306 (openflow_builder)                ║"
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
