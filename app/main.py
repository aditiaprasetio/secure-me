import asyncio
import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="SecureMe - Security Pentest Tool")

FE_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FE_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FE_DIST, "assets")), name="assets")

scans: dict[str, dict] = {}

TOOLS = {
    "nmap": {
        "cmd": "nmap",
        "syntax": "{cmd} {args} {target}",
        "default_args": "-sV -sC",
        "placeholder": "192.168.1.1 or scanme.nmap.org",
        "desc": "Network discovery & security scanning",
    },
    "nikto": {
        "cmd": "nikto",
        "syntax": "{cmd} -h {target} {args}",
        "default_args": "-ssl -Format txt",
        "placeholder": "https://example.com",
        "desc": "Web server vulnerability scanner",
    },
    "sqlmap": {
        "cmd": "sqlmap",
        "syntax": "{cmd} -u {target} --batch {args}",
        "default_args": "--random-agent --level 1",
        "placeholder": "http://example.com/page?id=1",
        "desc": "SQL injection detection & exploitation",
    },
    "whatweb": {
        "cmd": "whatweb",
        "syntax": "{cmd} {target} {args}",
        "default_args": "--color=never",
        "placeholder": "https://example.com",
        "desc": "Website technology fingerprinting",
    },
    "gobuster": {
        "cmd": "gobuster",
        "syntax": "{cmd} dir -u {target} -w {wordlist} {args}",
        "default_args": "-t 50 -x php,html,txt",
        "placeholder": "https://example.com",
        "desc": "Directory/file brute-forcing",
    },
    "dnsrecon": {
        "cmd": "dnsrecon",
        "syntax": "{cmd} -d {target} {args}",
        "default_args": "-t std",
        "placeholder": "example.com",
        "desc": "DNS enumeration & reconnaissance",
    },
}

AI_PROVIDERS = {
    "openai": {
        "name": "OpenAI",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        "default_model": "gpt-4o-mini",
        "api_url": "https://api.openai.com/v1/chat/completions",
        "needs_bearer": True,
    },
    "gemini": {
        "name": "Google Gemini",
        "models": ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
        "default_model": "gemini-2.0-flash",
        "api_url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "needs_bearer": False,
    },
    "deepseek": {
        "name": "DeepSeek",
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "default_model": "deepseek-chat",
        "api_url": "https://api.deepseek.com/v1/chat/completions",
        "needs_bearer": True,
    },
    "claude": {
        "name": "Anthropic Claude",
        "models": ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229"],
        "default_model": "claude-3-haiku-20240307",
        "api_url": "https://api.anthropic.com/v1/messages",
        "needs_bearer": False,
    },
}

WORDLIST = "/usr/share/dirb/wordlists/common.txt"


class ScanRequest(BaseModel):
    target: str
    tool: str
    args: Optional[str] = ""


class RecommendRequest(BaseModel):
    provider: str
    model: Optional[str] = None
    api_key: str
    target: str
    tool: str
    args: str
    output: list[str]


def build_command(tool: str, target: str, args: str) -> list[str]:
    cfg = TOOLS.get(tool)
    if not cfg:
        raise ValueError(f"Unknown tool: {tool}")

    effective_args = args or cfg["default_args"]
    cmd_str = cfg["syntax"].format(
        cmd=cfg["cmd"],
        target=target,
        args=effective_args,
        wordlist=WORDLIST,
    )

    result = []
    for part in cmd_str.split():
        result.append(part)
    return result


@app.get("/", response_class=HTMLResponse)
async def index():
    idx = os.path.join(FE_DIST, "index.html")
    if os.path.isfile(idx):
        with open(idx) as f:
            return f.read()
    return HTMLResponse("<h1>SecureMe</h1><p>Frontend not built. Run: cd frontend && npm run build</p>")


@app.get("/api/tools")
async def list_tools():
    return [
        {"id": k, "name": v["cmd"], "desc": v["desc"], "placeholder": v["placeholder"]}
        for k, v in TOOLS.items()
    ]


@app.get("/api/providers")
async def list_providers():
    return [
        {"id": k, "name": v["name"], "models": v["models"], "default_model": v["default_model"]}
        for k, v in AI_PROVIDERS.items()
    ]


@app.post("/api/scan")
async def start_scan(req: ScanRequest):
    if req.tool not in TOOLS:
        raise HTTPException(400, f"Unknown tool: {req.tool}")
    if not req.target.strip():
        raise HTTPException(400, "Target is required")

    scan_id = uuid.uuid4().hex[:8]
    now = datetime.now(timezone.utc).isoformat()
    scans[scan_id] = {
        "id": scan_id,
        "status": "queued",
        "target": req.target,
        "tool": req.tool,
        "args": req.args or TOOLS[req.tool]["default_args"],
        "output": [],
        "recommendation": None,
        "created_at": now,
        "completed_at": None,
    }

    asyncio.create_task(_run_scan(scan_id))
    return {
        "scan_id": scan_id,
        "target": req.target,
        "tool": req.tool,
        "args": req.args or TOOLS[req.tool]["default_args"],
        "created_at": now,
    }


async def _run_scan(scan_id: str):
    info = scans[scan_id]
    info["status"] = "running"

    try:
        cmd = build_command(info["tool"], info["target"], info["args"])
        info["output"].append(f"$ {' '.join(cmd)}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        while True:
            line = await process.stdout.readline()
            if not line:
                break
            decoded = line.decode("utf-8", errors="replace").rstrip("\n")
            cleaned = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", decoded)
            info["output"].append(cleaned)

        await process.wait()
    except FileNotFoundError:
        info["output"].append(f"[!] Tool '{info['tool']}' not found in container")
        info["output"].append("[!] Make sure it is installed in the Docker image")
    except Exception as e:
        info["output"].append(f"[!] Error: {e}")

    info["status"] = "completed"
    info["completed_at"] = datetime.now(timezone.utc).isoformat()



@app.get("/api/scan/{scan_id}/stream")
async def stream_scan(scan_id: str):
    info = scans.get(scan_id)
    if not info:
        raise HTTPException(404, "Scan not found")

    async def event_generator():
        sent_lines = 0
        while True:
            current = scans.get(scan_id)
            if not current:
                break

            lines = current["output"]
            while sent_lines < len(lines):
                payload = json.dumps({"type": "output", "data": lines[sent_lines]})
                yield f"data: {payload}\n\n"
                sent_lines += 1

            if current["status"] == "completed":
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                break

            await asyncio.sleep(0.1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _build_prompt(target: str, tool: str, args: str, output: list[str]) -> str:
    text = "\n".join(output)
    return f"""You are a senior cybersecurity analyst. Analyze these penetration testing results and provide actionable security recommendations.

Target: {target}
Tool: {tool}
Arguments: {args}

=== SCAN RESULTS ===
{text}
=== END RESULTS ===

Provide a structured analysis with these sections:
1. **Executive Summary** — 2-3 sentence overview of findings
2. **Findings & Vulnerabilities** — List each finding with severity (CRITICAL / HIGH / MEDIUM / LOW / INFO)
3. **Remediation Steps** — Specific, actionable steps to fix each issue
4. **Priority Actions** — Top 3 things to address immediately

Use plain text with markdown formatting. Be specific and practical."""


async def _call_ai(provider: str, model: str, api_key: str, prompt: str) -> str:
    cfg = AI_PROVIDERS[provider]

    if provider == "openai":
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                cfg["api_url"],
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model or cfg["default_model"],
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 4096,
                },
            )
            data = resp.json()
            if "error" in data:
                raise Exception(data["error"]["message"])
            return data["choices"][0]["message"]["content"]

    elif provider == "gemini":
        url = cfg["api_url"].format(model=model or cfg["default_model"])
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{url}?key={api_key}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            data = resp.json()
            if "error" in data:
                raise Exception(data["error"]["message"])
            return data["candidates"][0]["content"]["parts"][0]["text"]

    elif provider == "deepseek":
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                cfg["api_url"],
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model or cfg["default_model"],
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 4096,
                },
            )
            data = resp.json()
            if "error" in data:
                raise Exception(data["error"]["message"])
            return data["choices"][0]["message"]["content"]

    elif provider == "claude":
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                cfg["api_url"],
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model or cfg["default_model"],
                    "max_tokens": 4096,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = resp.json()
            if "error" in data:
                raise Exception(data["error"]["message"])
            return data["content"][0]["text"]

    raise ValueError(f"Unknown provider: {provider}")


@app.post("/api/recommend")
async def recommend_scan(req: RecommendRequest):
    if req.provider not in AI_PROVIDERS:
        raise HTTPException(400, f"Unknown provider: {req.provider}")
    if not req.api_key.strip():
        raise HTTPException(400, "API key is required")

    prompt = _build_prompt(req.target, req.tool, req.args, req.output)

    try:
        result = await _call_ai(req.provider, req.model or "", req.api_key, prompt)
        return {
            "provider": req.provider,
            "model": req.model or AI_PROVIDERS[req.provider]["default_model"],
            "result": result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(502, f"AI request failed: {e}")

