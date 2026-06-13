#!/bin/bash
# Amazon SecondLife AI — EC2 Deployment Script
# Run on EC2 Amazon Linux 2023 instance (t3.small minimum)
set -e

echo "========================================="
echo "  Amazon SecondLife AI — EC2 Deployment"
echo "========================================="

echo ""
echo "Installing system dependencies..."
sudo yum update -y
sudo yum install -y python3-pip nodejs npm nginx git

echo ""
echo "Setting up backend..."
cd /home/ec2-user/amazon-secondlife-ai/backend
pip3 install -r requirements.txt

echo ""
echo "Setting up frontend..."
cd /home/ec2-user/amazon-secondlife-ai/frontend
npm install
npm run build

echo ""
echo "Starting backend with uvicorn..."
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2 > /home/ec2-user/backend.log 2>&1 &

echo ""
echo "Configuring nginx..."
sudo tee /etc/nginx/conf.d/secondlife.conf > /dev/null <<'EOF'
server {
    listen 80;
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
EOF

sudo systemctl restart nginx

echo ""
echo "Starting Next.js..."
cd /home/ec2-user/amazon-secondlife-ai/frontend
nohup npm start -- -p 3000 > /home/ec2-user/frontend.log 2>&1 &

echo ""
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "your-ec2-ip")
echo "✅ Deployment complete!"
echo "   App running at: http://${PUBLIC_IP}"
echo "   API docs at:    http://${PUBLIC_IP}/api/docs"
