# Campaign Manager Demo

## How To Run

### API (FastAPI)
```bash
cd ~/Desktop/campaign-manager-demo/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt 2>/dev/null || pip install "fastapi[all]"
uvicorn main:app --reload --port 8000
```

API URLs:

http://localhost:8000

Docs: http://localhost:8000/docs

OpenAPI: http://localhost:8000/openapi.json

### Web (UI)
```bash
cd ~/Desktop/campaign-manager-demo/web
npm install
npm run dev
```

Web URL:

http://localhost:3000
