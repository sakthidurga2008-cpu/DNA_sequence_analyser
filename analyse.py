def validate(dna):
    valid_nucleotides = {'A', 'C', 'G', 'T'}
    for nucleotide in dna:
        if nucleotide not in valid_nucleotides:
            return False
    return True

def transcribe(dna):
    return dna.replace('T', 'U') 
        
def complement(dna):
    complement_map = {'A': 'T', 'C': 'G', 'G': 'C', 'T': 'A'}
    complement_dna = ''.join(complement_map[nucleotide] for nucleotide in dna)
    return complement_dna

def find_start_codon(mrna):
    return mrna.find('AUG')


def find_stop_codon(mrna):
    """Return the index of the first in-frame stop codon (UAA, UAG, UGA)
    that occurs after the first start codon (AUG) in the given mRNA.
    If no start codon or no in-frame stop codon is found, return -1.
    """
    mrna = mrna.upper()
    start = find_start_codon(mrna)
    if start == -1:
        return -1
    stop_codons = {'UAA', 'UAG', 'UGA'}
    # scan codons in-frame after the start codon
    for i in range(start + 3, len(mrna) - 2, 3):
        codon = mrna[i:i+3]
        if codon in stop_codons:
            return i
    return -1





# dna = input("Enter a DNA sequence: ")
# dna = dna.upper()

# is_valid = validate(dna)
# if is_valid:
#     print("The DNA sequence is valid.")
# else:
#     print("The DNA sequence is invalid.")

# if is_valid:
 


#     #sequence length 
#     print("1. The length of the DNA sequence is:", len(dna))

#     #counting nucleotides
#     nucleotide_counts = {nucleotide: dna.count(nucleotide) for nucleotide in 'ACGT'}
#     print("2. Nucleotide counts:")
#     for nucleotide, count in nucleotide_counts.items():
#         print(f"{nucleotide}: {count}")     

#     #GC content
#     gc_content = (nucleotide_counts['G'] + nucleotide_counts['C']) / len(dna) * 100
#     print("3. The GC content is: {:.2f}%".format(gc_content))



#     # DNA complement
#     complement_dna = complement(dna)
#     print("4. The complementary DNA sequence is:", complement_dna) 

#     # mRNA transcription
#     mrna = transcribe(dna)
#     print("5. The mRNA sequence is:", mrna)

#     #detect start codon and stop codon
#     start_index = find_start_codon(mrna)
#     if start_index != -1:
#         print("6. Start codon (AUG) found at index:", start_index)
#         stop_index = find_stop_codon(mrna)
#         if stop_index != -1:
#             print("7. Stop codon found at index:", stop_index)
#             print("   Stop codon:", mrna[stop_index:stop_index+3])
#         else:
#             print("7. No in-frame stop codon found after the start codon.")
#     else:
#         print("6. Start codon (AUG) not found in the mRNA sequence.")

