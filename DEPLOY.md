# Deployment Guide

## Prerequisites

- Node.js >= 18
- A [Gemini API key](https://aistudio.google.com/apikey)

---

## Option 1: Vercel (Recommended for quick deploy)

### One-click deploy

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Add environment variables in the Vercel dashboard:
   - `GEMINI_API_KEY` — your Gemini API key
   - `SESSION_SECRET` — any random string (e.g. `openssl rand -hex 32`)
4. Click **Deploy**

### CLI deploy

```bash
npm i -g vercel
vercel login
vercel              # preview deployment
vercel --prod       # production deployment
```

Set secrets:

```bash
vercel env add GEMINI_API_KEY
vercel env add SESSION_SECRET
```

### Notes

- Vercel auto-detects `vercel.json` and routes all `/api/*` through the Express server
- Static files in `public/` are served via Vercel's CDN
- Sessions use in-memory store (stateless per invocation) — for persistent sessions on Vercel, consider adding `connect-redis` with Upstash Redis
- The `VERCEL=1` env var is set automatically by Vercel

---

## Option 2: Hostinger VPS

### Initial setup

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Clone the repo
git clone https://github.com/your-username/Bodylang.git
cd Bodylang

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
nano .env   # fill in GEMINI_API_KEY and SESSION_SECRET
```

### Start with PM2

```bash
# Start the app in cluster mode
npm run pm2:start

# Check status
pm2 status

# View logs
npm run pm2:logs

# Set PM2 to auto-start on reboot
pm2 startup
pm2 save
```

### Nginx reverse proxy (recommended)

Create `/etc/nginx/sites-available/bodylang`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 15M;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/bodylang /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Hostinger Node.js Hosting (shared)

If using Hostinger's Node.js shared hosting instead of VPS:

1. Go to hPanel > **Website** > **Node.js**
2. Set **Application root** to your project folder
3. Set **Application startup file** to `server.js`
4. Set **Node.js version** to 18 or 20
5. Add environment variables: `GEMINI_API_KEY`, `SESSION_SECRET`, `NODE_ENV=production`
6. Click **Restart app**

---

## Option 3: Any VPS / Docker

### Docker

```bash
docker build -t bodylang .
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY=your-key \
  -e SESSION_SECRET=your-secret \
  -e NODE_ENV=production \
  --name bodylang bodylang
```

### Direct Node.js

```bash
npm install --production
NODE_ENV=production node server.js
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `SESSION_SECRET` | Recommended | Session encryption key (auto-generated if missing) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` for secure cookies + trust proxy |

---

## Updating

```bash
git pull origin main
npm install --production
npm run pm2:restart    # if using PM2
# or: vercel --prod   # if using Vercel
```
