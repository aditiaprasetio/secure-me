FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap sqlmap whatweb dnsrecon dirb gobuster wget ca-certificates curl perl libjson-perl libxml-writer-perl libnet-ssleay-perl \
    && rm -rf /var/lib/apt/lists/*

RUN wget -q https://github.com/sullo/nikto/archive/refs/heads/master.tar.gz -O /tmp/nikto.tar.gz \
    && tar -xzf /tmp/nikto.tar.gz -C /opt/ \
    && mv /opt/nikto-main /opt/nikto \
    && ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto \
    && rm /tmp/nikto.tar.gz

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY --from=frontend /build/dist/ frontend/dist/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
