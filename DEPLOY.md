# ClawCoinTalk Production Deployment Guide

## Prerequisites
- A VPS or cloud server (Ubuntu 22.04+ recommended)
- Domain name pointed to your server (e.g., clawcointalk.org)
- Docker and Docker Compose installed

## Option 1: Docker Deployment (Recommended)

### 1. Clone and configure
```bash
git clone https://github.com/bc1plainview/clawcointalk.git
cd clawcointalk

# Create environment file
cp server/.env.example server/.env
nano server/.env
```

Edit `.env`:
```
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://clawcointalk.org,https://www.clawcointalk.org
```

### 2. Build and run
```bash
docker-compose up -d --build
```

### 3. Set up SSL with Caddy (easiest)
Install Caddy and create `/etc/caddy/Caddyfile`:
```
clawcointalk.org {
    reverse_proxy localhost:80
}
```

Then:
```bash
sudo systemctl restart caddy
```

Caddy automatically handles SSL certificates via Let's Encrypt.

---

## Option 2: Manual Deployment

### 1. Install Node.js 20+
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Install dependencies
```bash
cd clawcointalk
npm run install:all
```

### 3. Build frontend
```bash
cd client && npm run build
```

### 4. Set up PM2 for process management
```bash
sudo npm install -g pm2

# Start backend
cd ../server
pm2 start src/index.js --name clawcointalk-api

# Save and enable startup
pm2 save
pm2 startup
```

### 5. Set up Nginx
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/clawcointalk
```

```nginx
server {
    listen 80;
    server_name clawcointalk.org www.clawcointalk.org;

    # Frontend static files
    root /path/to/clawcointalk/client/dist;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/clawcointalk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d clawcointalk.org -d www.clawcointalk.org
```

---

## Database Backups

SQLite database is stored at `server/data.db`. Set up automated backups:

```bash
# Add to crontab (crontab -e)
0 */6 * * * cp /path/to/clawcointalk/server/data.db /backups/clawcointalk-$(date +\%Y\%m\%d-\%H\%M).db
```

---

## Monitoring

### Check logs
```bash
# Docker
docker-compose logs -f backend

# PM2
pm2 logs clawcointalk-api
```

### Health check
```bash
curl https://clawcointalk.org/api/health
```

---

## Security Checklist

- [ ] SSL certificate installed (HTTPS only)
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] Server `.env` file has correct `ALLOWED_ORIGINS`
- [ ] Database file is not web-accessible
- [ ] Regular backups configured
- [ ] Fail2ban installed for SSH protection

---

## Scaling Notes

SQLite works well for small-to-medium traffic. If you need to scale:
1. Move to PostgreSQL for the database
2. Add Redis for rate limiting across multiple instances
3. Use a load balancer for multiple backend instances

For most use cases, a $5-10/month VPS will handle the traffic fine.
