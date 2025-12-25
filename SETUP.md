# OpenFlow Builder - Setup & Launch Guide

**One-command setup that works everywhere. No manual configuration needed.**

---

## 🚀 Quick Start (3 Steps)

### 1. Extract the ZIP
```bash
unzip openflow-builder.zip
cd openflow-builder
```

### 2. Run the Launch Script
```bash
./launch.sh
```

### 3. Open in Browser
```
http://localhost:3000
```

**That's it!** The script handles everything automatically.

---

## ✨ What the Launch Script Does

The `launch.sh` script is designed to work **anywhere, on any device, first time, every time**.

### Automatic Detection & Setup:
1. ✅ **Detects your OS** (macOS, Linux, Windows)
2. ✅ **Checks dependencies** (Node.js, pnpm, MySQL)
3. ✅ **Installs missing software** (if needed)
4. ✅ **Creates .env file** with sensible defaults
5. ✅ **Sets up MySQL database** automatically
6. ✅ **Installs npm packages** (pnpm install)
7. ✅ **Runs database migrations** (drizzle-kit)
8. ✅ **Starts the dev server** on port 3000

### No Manual Configuration Required:
- ❌ No editing config files
- ❌ No creating databases manually
- ❌ No environment variable setup
- ❌ No mysterious error messages
- ✅ Just extract and run

---

## 📋 System Requirements

### Minimum:
- **Node.js** 18+ (script can install)
- **pnpm** 10+ (script can install)
- **MySQL** 5.7+ (script can help start)

### Recommended:
- **macOS 12+** or **Linux** (Ubuntu 20+) or **Windows 10/11**
- **4GB RAM** minimum
- **500MB disk space**

### Optional:
- **Git** (for version control)
- **VS Code** (for development)

---

## 🖥️ Platform-Specific Notes

### macOS (Intel & Apple Silicon)
```bash
# Script will auto-install via Homebrew if needed
./launch.sh

# If MySQL not installed:
brew install mysql
brew services start mysql
./launch.sh
```

### macOS - Start MySQL Manually (if needed)
```bash
# Intel Mac
mysql.server start

# Apple Silicon (M1/M2/M3)
brew services start mysql
```

### Linux (Ubuntu/Debian)
```bash
# Script will prompt for sudo if needed
./launch.sh

# If issues, manually install MySQL:
sudo apt-get install mysql-server
sudo systemctl start mysql
./launch.sh
```

### Windows (PowerShell)
```powershell
# Use PowerShell (not Command Prompt)
bash ./launch.sh

# Or convert to PowerShell script:
# (We can provide launch.ps1 if needed)
```

**Windows Note**: You may need to install:
- Node.js from https://nodejs.org
- MySQL from https://dev.mysql.com/downloads/mysql/
- Then run `./launch.sh`

---

## 🔧 What Gets Created

After running `./launch.sh`:

```
openflow-builder/
├── .env                          # Auto-generated (do NOT commit)
├── node_modules/                 # npm packages installed
├── dist/                         # Built output (after first build)
└── [other project files]

MySQL Database:
└── openflow_builder              # Auto-created database
    ├── users table
    ├── projects table
    ├── pages table
    └── [other tables]
```

### The .env File (Auto-Generated)
```
DATABASE_URL="mysql://root:openflow@localhost:3306/openflow_builder"
JWT_SECRET="[random 32-character string]"
NODE_ENV="development"
PORT=3000
```

**Never commit .env to Git** - it's in `.gitignore`

---

## ✅ Successful Startup

When everything works, you'll see:

```
╔═══════════════════════════════════════════════════════════════╗
║                     🚀 READY TO GO 🚀                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Frontend:  http://localhost:3000                            ║
║  Backend:   http://localhost:3000/api/trpc                   ║
║  Database:  localhost:3306 (openflow_builder)                ║
║                                                               ║
║  Ctrl+C to stop server                                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

Then open **http://localhost:3000** in your browser.

---

## 🛠️ Manual Database Setup (If Needed)

If the script can't set up MySQL automatically:

### macOS
```bash
# Install MySQL (if not already installed)
brew install mysql

# Start MySQL service
brew services start mysql

# Set root password (if prompted)
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'openflow';"

# Create database
mysql -u root -p openflow << EOF
CREATE DATABASE IF NOT EXISTS openflow_builder;
EXIT;
EOF

# Then run the script again
./launch.sh
```

### Linux
```bash
# Install MySQL
sudo apt-get install mysql-server

# Start MySQL service
sudo systemctl start mysql

# Set root password
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'openflow';"

# Create database
sudo mysql -u root -p openflow << EOF
CREATE DATABASE IF NOT EXISTS openflow_builder;
EXIT;
EOF

# Then run the script again
./launch.sh
```

---

## ❌ Troubleshooting

### "MySQL not running"
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Then run again
./launch.sh
```

### "Port 3000 already in use"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 ./launch.sh
```

### "Permission denied: ./launch.sh"
```bash
# Make script executable
chmod +x launch.sh

# Then run
./launch.sh
```

### "pnpm: command not found"
```bash
# Install pnpm
npm install -g pnpm@10

# Then run
./launch.sh
```

### "Database migration failed"
```bash
# Check if MySQL is running
mysql -u root -e "SELECT 1;"

# If not, start it and run again
./launch.sh
```

### "Node modules broken"
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
./launch.sh
```

---

## 📚 Next Steps After Launch

### 1. **Explore the App**
- Create a project
- Add pages and elements
- Try the AI builder features

### 2. **Review Documentation**
- Read `QUICK_START.md` for integration details
- Check `IMPLEMENTATION_EXAMPLES.md` for code examples
- See `IMPROVEMENTS.md` for advanced features

### 3. **Development Workflow**
```bash
# While server is running in one terminal:
# - Changes auto-reload with Vite
# - TypeScript checks: pnpm check
# - Build for production: pnpm build
# - Run tests: pnpm test
```

### 4. **Database Changes**
```bash
# If you modify schema in drizzle/schema.ts:
pnpm db:push
```

### 5. **Stop the Server**
```bash
# Press Ctrl+C in the terminal
# Or kill the process
kill -9 $(lsof -t -i:3000)
```

---

## 🔄 Fresh Start

If you need to reset everything:

```bash
# Stop the server (Ctrl+C)

# Reset database
mysql -u root -p openflow << EOF
DROP DATABASE openflow_builder;
CREATE DATABASE openflow_builder;
EXIT;
EOF

# Clear npm cache
rm -rf node_modules .next dist

# Reinstall and restart
./launch.sh
```

---

## 🎯 For Your Employer

**Send them:**
1. This folder as a ZIP
2. Ask them to extract and run `./launch.sh`
3. That's it!

The script handles everything - no special instructions needed.

---

## 📞 Support

If something doesn't work:

1. **Check error messages** - they're designed to be helpful
2. **See troubleshooting section above**
3. **Verify MySQL is running**: `mysql -u root -e "SELECT 1;"`
4. **Check logs** in the terminal output
5. **Try the manual database setup** section

---

## 🎉 You're All Set!

Everything is configured to work out-of-the-box.

**One command. Works everywhere. First time, always.**

```bash
./launch.sh
```

Enjoy building! 🚀
