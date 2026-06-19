import time
import requests
from fastapi import FastAPI, UploadFile, File

app = FastAPI()

# 1. SETUP PARAMETERS
# Replace this with your actual unknown DNA sequence
QUERY_SEQUENCE = "AAGCAGAACTGTGTTTTCAGTTGATGTGTCAGTCCCCTGAGAGTCATGTGGAAAAAAAAAAAAAGAAAAAATTCAAGGTCCAGGTTATTTCCACCACTCCTGGGAAACCAGGCCTGGAGAGCTCTCTAGGGAAAGAGGTATGTCTGCTCTGGGCTTTTGCAACCTTATTTTATAATTCACTTTCTTATCTACTGCTTCACAAAACCAAAGGGAAATAGGTACAAACTGTATCGACAAAAGATCAGAACTGAATTCTCAATGGCAAAGGCAAGTGTACATTATAAATAGCAAAACAGCTGGCTTGGACCATGTTGCCGGCCAGTCACCCAGTTGAGGGATTTGAATGACATCATAACCCTCGAGAGGGTATTGCTAGCCAGCTGGTGTTATTTAGAATACACAAAAATCAGAGAAAGAAAACACACTCTGGCACACAGACTCCCTCTGTCATACACACACACACACACACACACACACACACACACACACACAGGTTTGAGTTATATGGAAAATTCAAACAACAGGAAAATTGTTTGCCCCCCAGGTACCCTTCTCCCAGAGTGGTGGGGTGGGGAGGGGACAGTGACAGGCAGCCTAGTAGAAGAATAAAGAAAAATGTTCTATTTCAGTTGGGTTTTACAGCTCGGCATAGTCTTTGCCTCATCGCAGGAGAAAAAGTATGAGACAGTGCCCTAAAGGGACCAATCCAATGCTGCCTGCCCCTCCATAGGTTCTAGGAAATGAGATCACACCTCTCACTTGGCAACTGGGACAAGGGGTCACCCGAGTGCTGTCTTCCAATCTACTTTACCCCAGTCACTTCAGGGTTAAAATTGTAGAGTTTGCTGGAGAGGGTCTTATCGTCCTTTCTTTCTTTTTTTGTTTTAAATAATGCATTTGCTCTAGAATCTAAAATTGCTCTCCCATCCCCCATATTCCTTTAATACTGGTAAGGTGTATTAGCAGACGTTTGTGTCTTC" 

# NCBI Base URL for API requests
BLAST_URL = "https://blast.ncbi.nlm.nih.gov/Blast.cgi"

# Step 1: Submit the Sequence (PUT request)
put_payload = {
    "CMD": "Put",
    "PROGRAM": "blastn",        # Use 'blastn' for DNA, 'blastp' for protein
    "DATABASE": "nt",           # 'nt' is the standard nucleotide database
    "QUERY": QUERY_SEQUENCE,
    "FORMAT_TYPE": "XML"        # Requesting XML back makes parsing easier later
}

print("Submitting sequence to NCBI BLAST...")
response = requests.post(BLAST_URL, data=put_payload)

# Parse out the RID (Request ID) and RTOE (Estimated Time of Execution)
lines = response.text.split("\n")
rid = ""
rtoe = 30 # Default safety fallback of 30 seconds

for line in lines:
    if "RID =" in line:
        rid = line.split("=")[1].strip()
    if "RTOE =" in line:
        rtoe = int(line.split("=")[1].strip())

if not rid:
    print("Failed to get an RID from NCBI. Output response summary:")
    print(response.text[:500])
    exit()

print(f"Submission Successful!")
print(f"Request ID (RID): {rid}")
print(f"Estimated Wait Time (RTOE): {rtoe} seconds...\n")

# Wait the initial estimated time before checking status
time.sleep(rtoe)

# Step 2: Check Status Loop (GET request)
check_payload = {
    "CMD": "Get",
    "RID": rid,
    "FORMAT_OBJECT": "SearchInfo"
}

while True:
    print("Checking search status...")
    status_response = requests.get(BLAST_URL, params=check_payload)
    
    if "Status=WAITING" in status_response.text:
        print("BLAST is still running... waiting 15 seconds.")
        time.sleep(15)
    elif "Status=FAILED" in status_response.text:
        print("BLAST search failed on NCBI servers.")
        exit()
    elif "Status=READY" in status_response.text:
        print("Search complete! Results are ready.")
        if "ThereAreHits=yes" in status_response.text:
            print("Matches found!")
            break
        else:
            print("Search completed, but no matches found.")
            exit()
    else:
        # Sometimes NCBI returns the results directly if they finish incredibly fast
        if "BlastOutput" in status_response.text:
            print("Results returned early!")
            break
        print("Unexpected status received. Trying again in 15 seconds.")
        time.sleep(15)

# Step 3: Retrieve the Results (GET request)
get_payload = {
    "CMD": "Get",
    "RID": rid,
    "FORMAT_TYPE": "Text",       # 'Text' returns a clean human-readable report. 
    "ALIGNMENT_VIEW": "Tabular"  # 'Tabular' is highly recommended for easy parsing!
}

print("Downloading alignment results...")
results_response = requests.get(BLAST_URL, params=get_payload)

# Save results to a local file
output_file = "blast_results.txt"
with open(output_file, "w") as f:
    f.write(results_response.text)

print(f"Success! Your results have been saved to '{output_file}'")