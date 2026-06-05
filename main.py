from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from analyse import validate, complement, transcribe, find_start_codon, find_stop_codon


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
    transcribed: str = None
    complement: str = None
    start_codon_index: int = None
    stop_codon_index: int = None
    

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
    return {"message": "Hello World"}


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
    
    sequence= data[id]['seq'] 
    transcribed = transcribe(sequence)
    complement_seq = complement(sequence)
    start_codon_index = find_start_codon(transcribed)
    stop_codon_index = find_stop_codon(transcribed)
    data[id]['transcribed'] = transcribed
    data[id]['complement'] = complement_seq
    data[id]['start_codon_index'] = start_codon_index
    data[id]['stop_codon_index'] = stop_codon_index
    return data[id]
