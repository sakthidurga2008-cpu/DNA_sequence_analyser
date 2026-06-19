# DNA_SA

DNA sequence analysis app with a FastAPI backend and a Vite + React UI.

## Key Features

- Validate DNA sequences (`A`, `C`, `G`, `T` only)
- Store records in memory (no database)
- Analyse sequences: length, counts, GC/AT %, complement, reverse complement, transcription, translation, ORFs
- Upload FASTA files and auto-create records
- Compare two sequences for similarity
- Run NCBI BLAST homology and download results

## Tech Stack

- **Backend**: FastAPI, Pydantic, Requests, Biopython
- **Frontend**: React 19, Vite, Tailwind CSS
- **Tools**: ESLint, jsPDF

## Project Structure

```text
DNA_SA/
├── analyse.py
├── blast.py
├── main.py
├── blast_results.txt
└── UI/
    ├── package.json
    └── src/
```

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm

## Backend Setup (FastAPI)

```bash
cd /home/sakthi/github/DNA_SA
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn requests biopython
```

Run backend:

```bash
uvicorn main:app --reload
```

Backend: `http://127.0.0.1:8000`  
Docs: `http://127.0.0.1:8000/docs`

## Frontend Setup (Vite + React)

```bash
cd /home/sakthi/github/DNA_SA/UI
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Note: CORS allows `http://localhost:5173` and `http://localhost:3000`.

## API Endpoints

- `GET /` - health check
- `GET /Data` - list all records
- `GET /Data/{id}` - get one record
- `POST /Data` - create record (auto-assigns id)
- `GET /Data/analyse/{id}` - analyse record by id
- `POST /Data/Upload/file` - upload FASTA file
- `GET /Data/compare/{id1}/{id2}` - similarity percentage
- `POST /Data/homology/download` - run NCBI BLAST and download report

### Create a record

```bash
curl -X POST "http://127.0.0.1:8000/Data" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sakthi",
    "age": 22,
    "seq": "ATGAAATTTTAA"
  }'
```

### Analyse a record

```bash
curl -X GET "http://127.0.0.1:8000/Data/analyse/1"
```

### Upload FASTA

```bash
curl -X POST "http://127.0.0.1:8000/Data/Upload/file" \
  -F "file=@/path/to/sample.fasta"
```

### Compare two records

```bash
curl -X GET "http://127.0.0.1:8000/Data/compare/1/2"
```

### BLAST homology download

```bash
curl -X POST "http://127.0.0.1:8000/Data/homology/download" \
  -H "Content-Type: application/json" \
  -d '{"seq": "ATGAAATTTTAA"}' \
  -o blast_results.txt
```

## Notes

- Records are stored in memory and reset on server restart.
- `blast.py` is a standalone script for BLAST experimentation.
