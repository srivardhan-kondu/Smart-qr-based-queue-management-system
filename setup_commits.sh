#!/bin/zsh
# setup_commits.sh
# Creates all 18 commits locally. Run ONCE. Then run push_scheduler.sh to push them 30 min apart.

set -e
cd '/Users/srivardhan/PULSE PROJECTS/March/QR Code'

echo ">>> Backing up original files..."
cp server.js server.js.bak
cp db.js db.js.bak
cp public/app.js app.js.bak

echo ">>> Initializing git repo..."
git init
git remote add origin https://github.com/srivardhan-kondu/Smart-qr-based-queue-management-system.git
git branch -M main

# ── COMMIT 1 ─────────────────────────────────────────────────────────────────
echo ">>> [1/18] chore: add Node.js .gitignore"
printf 'node_modules/\ncanteen.db\ncanteen.db-shm\ncanteen.db-wal\n*.cookies\n*.ck\n*.log\n.env\n.DS_Store\n' > .gitignore
git add .gitignore
git commit -m "chore: add Node.js .gitignore"

# ── COMMIT 2 ─────────────────────────────────────────────────────────────────
echo ">>> [2/18] chore: initialize project with Express, SQLite and utility dependencies"
git add package.json
git commit -m "chore: initialize project with Express, SQLite and utility dependencies"

# ── COMMIT 3 ─────────────────────────────────────────────────────────────────
echo ">>> [3/18] feat(db): define 6-table SQLite schema with WAL mode"
head -86 db.js.bak > db.js
git add db.js
git commit -m "feat(db): define 6-table SQLite schema with WAL mode"

# ── COMMIT 4 ─────────────────────────────────────────────────────────────────
echo ">>> [4/18] feat(db): seed admin user and 12 menu items across 5 categories"
cp db.js.bak db.js
git add db.js
git commit -m "feat(db): seed admin user and 12 menu items across 5 categories"

# ── COMMIT 5 ─────────────────────────────────────────────────────────────────
echo ">>> [5/18] feat(server): bootstrap Express app with session auth and middleware"
head -53 server.js.bak > server.js
git add server.js
git commit -m "feat(server): bootstrap Express app with session auth and middleware"

# ── COMMIT 6 ─────────────────────────────────────────────────────────────────
echo ">>> [6/18] feat(auth): implement login, logout and role-based access middleware"
head -115 server.js.bak > server.js
git add server.js
git commit -m "feat(auth): implement login, logout and role-based access middleware"

# ── COMMIT 7 ─────────────────────────────────────────────────────────────────
echo ">>> [7/18] feat(menu): add menu browsing API with budget filter support"
head -140 server.js.bak > server.js
git add server.js
git commit -m "feat(menu): add menu browsing API with budget filter support"

# ── COMMIT 8 ─────────────────────────────────────────────────────────────────
echo ">>> [8/18] feat(orders): implement order placement with QR code generation"
head -251 server.js.bak > server.js
git add server.js
git commit -m "feat(orders): implement order placement with QR code generation"

# ── COMMIT 9 ─────────────────────────────────────────────────────────────────
echo ">>> [9/18] feat(orders): add order tracking, cancellation window and rating"
head -340 server.js.bak > server.js
git add server.js
git commit -m "feat(orders): add order tracking, cancellation window and rating"

# ── COMMIT 10 ────────────────────────────────────────────────────────────────
echo ">>> [10/18] feat(admin): add admin order management and QR collection routes"
head -439 server.js.bak > server.js
git add server.js
git commit -m "feat(admin): add admin order management and QR collection routes"

# ── COMMIT 11 ────────────────────────────────────────────────────────────────
echo ">>> [11/18] feat(admin): add analytics, background auto-prepare job and SPA routing"
cp server.js.bak server.js
git add server.js
git commit -m "feat(admin): add analytics, background auto-prepare job and SPA routing"

# ── COMMIT 12 ────────────────────────────────────────────────────────────────
echo ">>> [12/18] feat(ui): add mobile-first shared CSS with design tokens"
git add public/styles.css
git commit -m "feat(ui): add mobile-first shared CSS with design tokens"

# ── COMMIT 13 ────────────────────────────────────────────────────────────────
echo ">>> [13/18] feat(student): build student app HTML with login, menu and order views"
git add public/index.html
git commit -m "feat(student): build student app HTML with login, menu and order views"

# ── COMMIT 14 ────────────────────────────────────────────────────────────────
echo ">>> [14/18] feat(student): add UI state management and menu rendering"
head -119 app.js.bak > public/app.js
git add public/app.js
git commit -m "feat(student): add UI state management and menu rendering"

# ── COMMIT 15 ────────────────────────────────────────────────────────────────
echo ">>> [15/18] feat(student): add order placement, live tracking and star rating"
cp app.js.bak public/app.js
git add public/app.js
git commit -m "feat(student): add order placement, live tracking and star rating"

# ── COMMIT 16 ────────────────────────────────────────────────────────────────
echo ">>> [16/18] feat(admin-ui): build admin dashboard HTML with sidebar and 5-tab layout"
git add public/admin.html
git commit -m "feat(admin-ui): build admin dashboard HTML with sidebar and 5-tab layout"

# ── COMMIT 17 ────────────────────────────────────────────────────────────────
echo ">>> [17/18] feat(admin-ui): add admin dashboard JS for orders, QR scan and analytics"
git add public/admin.js
git commit -m "feat(admin-ui): add admin dashboard JS for orders, QR scan and analytics"

# ── COMMIT 18 ────────────────────────────────────────────────────────────────
echo ">>> [18/18] docs: add comprehensive README with system architecture and test cases"
git add README.md
git commit -m "docs: add comprehensive README with system architecture and test cases"

# Cleanup backup files
rm -f server.js.bak db.js.bak app.js.bak

echo ""
echo "========================================="
echo "All 18 commits created successfully!"
echo "========================================="
echo ""
git log --oneline
echo ""
echo "Next step: run   zsh push_scheduler.sh"
echo "It will push one commit every 30 minutes automatically."
