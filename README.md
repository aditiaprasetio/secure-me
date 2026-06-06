# SecureMe

Security pentest dashboard — run security tools directly from your browser.

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)

### Run

```bash
docker compose up -d --build
```

Open **http://localhost:8000**

### Stop

```bash
docker compose down
```

## Available Tools

| Tool | Description |
|------|-------------|
| **nmap** | Network discovery & port scanning |
| **nikto** | Web server vulnerability scanner |
| **sqlmap** | SQL injection detection & exploitation |
| **whatweb** | Website technology fingerprinting |
| **gobuster** | Directory/file brute-forcing |
| **dnsrecon** | DNS enumeration & reconnaissance |

## How to Use

1. Open `http://localhost:8000`
2. Enter the **target** (IP, domain, or URL)
3. Select the **tool**
4. (Optional) Add additional **arguments**
5. Click **Run Scan** — real-time streaming output
6. (Optional) Send results to AI for remediation recommendations

## AI Recommendation

After the scan is complete, the results can be sent to AI to receive security recommendations.

### Setup

1. Click the **⚙** icon in the top right corner
2. Select the **provider** (OpenAI / Gemini / DeepSeek / Claude)
3. Select the **model**
4. Enter the **API key**
5. Click **Save Settings** — saved in the browser's localStorage

### Providers & Models

| Provider | Default Model | API Key Format |
|----------|--------------|----------------|
| OpenAI | `gpt-4o-mini` | `sk-...` |
| Google Gemini | `gemini-2.0-flash` | Google AI API key |
| DeepSeek | `deepseek-chat` | `sk-...` |
| Anthropic Claude | `claude-3-haiku-20240307` | `sk-ant-...` |

The API key is only sent to the SecureMe backend (forwarded to the API provider) and is not stored on the server.

## Development (Hot Reload)

Run the frontend separately for hot reload during development:

```bash
# Terminal 1 — Backend
docker compose up -d

# Terminal 2 — Frontend dev server (proxies API to container)
cd frontend
npm install
npm run dev
```

Frontend dev server runs at `http://localhost:5173` (API is automatically proxied to port 8000).

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tools` | List of available tools |
| `GET` | `/api/providers` | List of AI providers |
| `POST` | `/api/scan` | Start a new scan |
| `GET` | `/api/scan/{id}/stream` | SSE streaming scan output |
| `POST` | `/api/recommend` | Request AI recommendation |

### Example: Start Scan

```bash
curl -X POST http://localhost:8000/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"target":"scanme.nmap.org","tool":"nmap","args":"-sV -sC"}'
```

### Example: AI Recommendation

```bash
curl -X POST http://localhost:8000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"provider":"openai","model":"gpt-4o-mini","api_key":"sk-...","target":"scanme.nmap.org","tool":"nmap","args":"-sV -sC","output":["$ nmap ...","Host is up..."]}'
```

## Deployment

### VPS / Cloud VM

```bash
# Clone & enter directory
git clone <repo-url> secure-me
cd secure-me

# Build & run
docker compose up -d --build
```

Access via `http://<vps-ip>:8000`.

### With Reverse Proxy (Nginx + SSL)

```nginx
server {
    listen 443 ssl;
    server_name secureme.example.com;

    ssl_certificate /etc/letsencrypt/live/secureme.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/secureme.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }
}
```

## ⚠ Warning

- **Only scan targets that you own** or have explicit permission to scan
- Unauthorized scanning is illegal in many jurisdictions
- Use only for legitimate security assessment purposes
