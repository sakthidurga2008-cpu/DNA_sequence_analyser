import requests

url = "http://localhost:8000/Data/10"
r = requests.post(url, json={"name": "sakthi", "age": 22, "seq": "AGCT"})
print(r.status_code)
print(r.json())

url = "http://localhost:8000/Data/1"
r1 = requests.post(url, json={"name":"durga", "age": 18, "seq": "ACGT"})
print(r1.json())

