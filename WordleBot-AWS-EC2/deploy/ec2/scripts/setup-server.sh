#!/usr/bin/env bash
# Runs ON the EC2 instance (called by 02-deploy.sh). Installs Python, Node.js and nginx,
# builds the app and registers the backend as a systemd service. Idempotent.
set -euo pipefail
APP=/home/ubuntu/app

if ! command -v nginx >/dev/null || ! command -v node >/dev/null; then
  sudo apt-get update -y
  sudo apt-get install -y python3-pip python3-venv nginx
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Backend: virtual environment + dependencies
cd $APP/backend
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt

# Frontend: build static files that call the API through nginx at /api
cd $APP/frontend-web
echo "VITE_API_BASE_URL=/api" > .env.production.local
npm install --silent
npm run build

# systemd keeps the backend running and starts it on boot
sudo cp $APP/deploy/ec2/systemd/wordlebot-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wordlebot-backend
sudo systemctl restart wordlebot-backend

# nginx serves the frontend and proxies /api to the backend
sudo cp $APP/deploy/ec2/nginx/wordlebot.conf /etc/nginx/sites-available/wordlebot
sudo ln -sf /etc/nginx/sites-available/wordlebot /etc/nginx/sites-enabled/wordlebot
sudo rm -f /etc/nginx/sites-enabled/default
chmod o+x /home/ubuntu   # let nginx (www-data) traverse into the home directory
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

# The solver precomputes its pattern table at startup (~10 s)
for i in $(seq 1 30); do curl -sf localhost:8000/health >/dev/null && break; sleep 1; done
echo "Backend ready"
