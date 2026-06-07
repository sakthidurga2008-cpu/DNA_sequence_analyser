from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from analyse import validate, complement, transcribe, find_start_codon, find_stop_codon
from Bio.Seq import Seq
from Bio import SeqIO
from io import StringIO
from fastapi import File, UploadFile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    Acount:int=None
    Ccount:int=None
    Gcount:int=None
    Tcount:int=None
    gccontent:float=None
    atcontent:float=None
    

@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...)):
    contents = await file.read()
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



#validate and post data
@app.post("/Data/{id}")
def post_data(id: int, item: Data):
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


    data[id]["transcribed"] = str(transcribed)
    data[id]["complement"] = str(complement_seq)
    # store numeric indices; -1 means not found
    data[id]["start_codon_index"] = int(start_codon_index) if isinstance(start_codon_index, int) else start_codon_index
    data[id]["stop_codon_index"] = int(stop_codon_index) if isinstance(stop_codon_index, int) else stop_codon_index
    # store translated/protein sequence (keep existing key name if used elsewhere)
    data[id]["protein_seq"] = str(translated)
    data[id]["reverse_complement"] = str(reverse_complement)
    data[id]["Acount"] = Acount
    data[id]["Ccount"] = Ccount
    data[id]["Gcount"] = Gcount
    data[id]["Tcount"] = Tcount
    data[id]["gccontent"] = gccontent
    data[id]["atcontent"] = atcontent   
    data[id]["length"] = len(sequence)


    return data[id]
