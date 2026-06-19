import re
import time
import requests
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from analyse import validate
from Bio.Seq import Seq
from Bio import SeqIO
from io import StringIO
from typing import Any
from fastapi.responses import Response


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Allow common local development origins. Adjust for production.
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.11:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data: dict[int, dict] = {}

class Data(BaseModel):
    name: str
    age: int
    seq : str
    length: int = None
    complement: str = None
    reverse_complement: str = None
    transcribed: str = None
    protein_seq: str = None
    start_codon_index: int = None
    stop_codon_index: int = None
    orf: str = None
    Acount:int=None
    Ccount:int=None
    Gcount:int=None
    Tcount:int=None
    gccontent:float=None
    atcontent:float=None
    start_codon_count: int = None
    stop_codon_count: int = None
    orf_frames: list[dict[str, Any]] = None
    translated_orfs: list[str] = None


class HomologyRequest(BaseModel):
    seq: str


def run_blast_homology(sequence: str) -> str:
    cleaned_sequence = re.sub(r"\s+", "", sequence.upper().replace("U", "T"))
    if not cleaned_sequence:
        raise ValueError("Empty sequence provided.")
    if not validate(cleaned_sequence):
        raise ValueError("Invalid DNA sequence. Only A, C, G, T are allowed.")

    blast_url = "https://blast.ncbi.nlm.nih.gov/Blast.cgi"
    put_payload = {
        "CMD": "Put",
        "PROGRAM": "blastn",
        "DATABASE": "nt",
        "QUERY": cleaned_sequence,
        "FORMAT_TYPE": "XML",
    }

    put_response = requests.post(blast_url, data=put_payload, timeout=60)
    put_response.raise_for_status()

    rid = ""
    rtoe = 30
    for line in put_response.text.split("\n"):
        if "RID =" in line:
            rid = line.split("=")[1].strip()
        if "RTOE =" in line:
            try:
                rtoe = int(line.split("=")[1].strip())
            except ValueError:
                rtoe = 30

    if not rid:
        raise RuntimeError("Failed to obtain BLAST request id (RID).")

    time.sleep(min(max(rtoe, 5), 60))

    check_payload = {
        "CMD": "Get",
        "RID": rid,
        "FORMAT_OBJECT": "SearchInfo",
    }

    max_checks = 20
    for _ in range(max_checks):
        status_response = requests.get(blast_url, params=check_payload, timeout=60)
        status_response.raise_for_status()
        status_text = status_response.text

        if "Status=WAITING" in status_text:
            time.sleep(10)
            continue
        if "Status=FAILED" in status_text:
            raise RuntimeError("BLAST search failed on NCBI servers.")
        if "Status=UNKNOWN" in status_text:
            raise RuntimeError("BLAST search expired or unknown RID.")
        if "Status=READY" in status_text and "ThereAreHits=no" in status_text:
            return "BLAST search completed. No hits found."
        if "Status=READY" in status_text and "ThereAreHits=yes" in status_text:
            break
        if "BlastOutput" in status_text:
            break
    else:
        raise RuntimeError("BLAST search timed out. Please try again.")

    get_payload = {
        "CMD": "Get",
        "RID": rid,
        "FORMAT_TYPE": "Text",
        "ALIGNMENT_VIEW": "Tabular",
    }
    result_response = requests.get(blast_url, params=get_payload, timeout=120)
    result_response.raise_for_status()
    return result_response.text


@app.post("/Data/homology/download")
def homology_download(payload: HomologyRequest):
    try:
        blast_report = run_blast_homology(payload.seq)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="Failed to connect to NCBI BLAST service.") from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    headers = {"Content-Disposition": 'attachment; filename="blast_results.txt"'}
    return Response(content=blast_report, media_type="text/plain", headers=headers)
    

@app.post("/Data/Upload/file")
async def upload(file:UploadFile):
    contents= await file.read()
    fasta_io = StringIO(contents.decode())
    records = list(SeqIO.parse(fasta_io, "fasta"))
    for record in records:
        seq_str = str(record.seq)
        if not validate(seq_str):
            return {"error": f"Invalid DNA sequence in file: {record.id}"}
        next_id = max(data.keys(), default=0) + 1
        data[next_id] = {
            "name": record.id,
            "age": 0,
            "seq": seq_str
        }
    return {"message": "File uploaded and data added successfully"}









@app.get("/Data/compare/{id1}/{id2}")
def compare_sequences(id1: int, id2: int):
    if id1 not in data or id2 not in data:
        return {"error": "One or both IDs not found"}
    
    seq1 = Seq(data[id1]['seq'])
    seq2 = Seq(data[id2]['seq'])
    
    # Calculate similarity (using simple identity for demonstration)
    matches = sum(1 for a, b in zip(seq1, seq2) if a == b)
    total_length = min(len(seq1), len(seq2))
    similarity_percentage = (matches / total_length) * 100 if total_length > 0 else 0
    
    return {
        "id1": id1,
        "id2": id2,
        "similarity_percentage": similarity_percentage
    }



# validate and post data
@app.post("/Data")
def post_data(item: Data):
    item.seq = item.seq.upper() 
    if not validate(item.seq):
        return {"error": "Invalid DNA sequence"}
    next_id = max(data.keys(), default=0) + 1
    data[next_id] = item.model_dump()
    return {"message": "Data added successfully", "id": next_id}

@app.get("/")
def greet():
    return {"message": "Hello User"}


@app.get("/Data")
def get_data():
    return [{"id": item_id, **item_data} for item_id, item_data in sorted(data.items())]


@app.get("/Data/{id}")
def get_student(id: int):
    if id in data:
        return data[id]
    return {"error": "Data not found"}

@app.get("/Data/analyse/{id}")
def analyse_data(id: int):
    if id not in data:
        return {"error": "Data not found"}
    
    sequence= Seq(data[id]['seq'] )

    transcribed = sequence.transcribe()
    complement_seq = sequence.complement()
    translated = sequence.translate()
    reverse_complement = sequence.reverse_complement()

    seq_str = str(sequence)

    # find start codon (ATG) and the first in-frame stop codon after it
    start_codon_index = sequence.find("ATG")
    # initialize stop index to -1 (not found)
    stop_codon_index = -1
    if start_codon_index != -1:
        stop_codons = ["TAA", "TAG", "TGA"]
        for i in range(start_codon_index + 3, len(sequence) - 2, 3):
            codon = str(sequence[i:i+3])
            if codon in stop_codons:
                stop_codon_index = i
                break
    
    Acount= sequence.count("A")
    Ccount= sequence.count("C")
    Gcount= sequence.count("G") 
    Tcount= sequence.count("T")
    total_bases = len(sequence)
    gccontent = (Gcount + Ccount) / total_bases * 100 
    atcontent = (Acount + Tcount) / total_bases * 100

    start_codon_count = sum(1 for i in range(0, len(seq_str) - 2) if seq_str[i:i+3] == "ATG")
    stop_codon_count = sum(1 for i in range(0, len(seq_str) - 2) if seq_str[i:i+3] in {"TAA", "TAG", "TGA"})

    orf_frames: list[dict[str, Any]] = []
    translated_orfs: list[str] = []
    stop_codons_set = {"TAA", "TAG", "TGA"}

    for frame in range(3):
        open_orf_start = -1
        for i in range(frame, len(seq_str) - 2, 3):
            codon = seq_str[i:i+3]

            if open_orf_start == -1 and codon == "ATG":
                open_orf_start = i
                continue

            if open_orf_start != -1 and codon in stop_codons_set:
                orf_seq = seq_str[open_orf_start:i+3]
                translated_orf = str(Seq(orf_seq).translate(to_stop=True))

                frame_entry = {
                    "frame": frame + 1,
                    "start": open_orf_start,
                    "stop": i,
                    "orf": orf_seq,
                    "protein": translated_orf,
                }
                orf_frames.append(frame_entry)
                translated_orfs.append(translated_orf)
                open_orf_start = -1


    data[id]["transcribed"] = str(transcribed)
    data[id]["complement"] = str(complement_seq)
    # store numeric indices; -1 means not found
    data[id]["start_codon_index"] = int(start_codon_index) if isinstance(start_codon_index, int) else start_codon_index
    data[id]["stop_codon_index"] = int(stop_codon_index) if isinstance(stop_codon_index, int) else stop_codon_index
    # store translated/protein sequence (keep existing key name if used elsewhere)
    data[id]["protein_seq"] = str(translated)
    data[id]["reverse_complement"] = str(reverse_complement)
    data[id]["orf"] = str(sequence[start_codon_index:stop_codon_index]) if start_codon_index != -1 and stop_codon_index != -1 else None
    data[id]["Acount"] = Acount
    data[id]["Ccount"] = Ccount
    data[id]["Gcount"] = Gcount
    data[id]["Tcount"] = Tcount
    data[id]["gccontent"] = gccontent
    data[id]["atcontent"] = atcontent   
    data[id]["length"] = len(sequence)
    data[id]["start_codon_count"] = start_codon_count
    data[id]["stop_codon_count"] = stop_codon_count
    data[id]["orf_frames"] = orf_frames
    data[id]["translated_orfs"] = translated_orfs


    return data[id]
