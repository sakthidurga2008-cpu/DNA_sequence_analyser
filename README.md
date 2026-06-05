# DNA_SA

A simple DNA Sequence Analysis app with:
- **Backend**: FastAPI (`main.py`)
- **Frontend**: React + Tailwind (`UI/`)

You can upload DNA records, view records, list all records, and run DNA analysis (transcription, complement, start/stop codon index).

## Features

- Validate DNA sequence input (`A`, `C`, `G`, `T` only)
- Save record with `name`, `age`, and `seq`
- Analyse sequence to compute:
  - `transcribed` (DNA -> mRNA)
  - `complement`
  - `start_codon_index` (`AUG`)
  - `stop_codon_index` (first in-frame `UAA`, `UAG`, `UGA`)

---

## Project Structure

```text
DNA_SA/
├── analyse.py
├── main.py
├── test_client.py
└── UI/
    ├── package.json
    └── src/
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm

---

## Backend Setup (FastAPI)

From project root:

```bash
cd /home/sakthi/github/DNA_SA
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn requests
```

### Run backend

```bash
uvicorn main:app --reload
```

Backend runs at: `http://127.0.0.1:8000`

Swagger docs: `http://127.0.0.1:8000/docs`

---

## Frontend Setup (React)

Open a new terminal:

```bash
cd /home/sakthi/github/DNA_SA/UI
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

> Note: Backend CORS currently allows only `http://localhost:3000`.

---

## How to Use

1. Start backend (`uvicorn main:app --reload`).
2. Start frontend (`npm start` inside `UI`).
3. Open `http://localhost:3000`.
4. Use pages:
   - **Upload**: create a DNA record.
   - **Analyse**: run analysis by record ID.
   - **View**: fetch one record by ID.
   - **List**: see all uploaded records.

---

## API Endpoints

- `GET /` - health/greeting
- `GET /Data` - list all records
- `GET /Data/{id}` - get one record
- `POST /Data/{id}` - create record (request id is not used internally; backend auto-assigns next id)
- `GET /Data/analyse/{id}` - analyse record by id

---

## Sample `curl` Commands

### 1) Check service

```bash
curl -X GET "http://127.0.0.1:8000/"
```

### 2) Create a DNA record

```bash
curl -X POST "http://127.0.0.1:8000/Data/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sakthi",
    "age": 22,
    "seq": "ATGAAATTTTAA"
  }'
```

### 3) List all records

```bash
curl -X GET "http://127.0.0.1:8000/Data"
```

### 4) Get one record by ID

```bash
curl -X GET "http://127.0.0.1:8000/Data/1"
```

### 5) Analyse a record by ID

```bash
curl -X GET "http://127.0.0.1:8000/Data/analyse/1"
```

### 6) Try invalid DNA (validation error)

```bash
curl -X POST "http://127.0.0.1:8000/Data/2" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invalid_case",
    "age": 20,
    "seq": "ATGBXZ"
  }'
```

---

## Quick Troubleshooting

- If frontend fails with `npm run dev`: use `npm start` (this project uses `react-scripts`).
- If port `8000` is busy, stop existing process and rerun `uvicorn`.
- If CORS error appears, ensure frontend is opened via `http://localhost:3000`.
