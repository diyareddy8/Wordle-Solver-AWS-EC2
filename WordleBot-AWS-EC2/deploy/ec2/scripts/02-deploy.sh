#!/usr/bin/env bash
# Packages the app, copies it to the instance with scp and runs the server setup over SSH.
# Safe to re-run for updates. Usage: ./02-deploy.sh <public-ip>
set -euo pipefail
IP=${1:?usage: $0 <public-ip>}
KEY=${KEY:-~/.ssh/wordlebot-key.pem}
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new ubuntu@$IP"

tar -C "$ROOT" --exclude=.venv --exclude=__pycache__ --exclude=node_modules --exclude=dist --exclude='*.log' \
  -czf /tmp/wordlebot_app.tar.gz backend frontend-web deploy/ec2/nginx deploy/ec2/systemd
scp -i "$KEY" -o StrictHostKeyChecking=accept-new /tmp/wordlebot_app.tar.gz ubuntu@"$IP":/home/ubuntu/
$SSH 'mkdir -p ~/app && tar -xzf ~/wordlebot_app.tar.gz -C ~/app'
$SSH 'bash -s' < "$(dirname "$0")/setup-server.sh"

curl -s -o /dev/null -w "frontend: HTTP %{http_code}\n" "http://$IP/"
curl -s "http://$IP/api/health"; echo
