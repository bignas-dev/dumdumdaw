import json
import requests

# 1️⃣  Endpoint
url = "http://127.0.0.1:6767/get_music"

# 2️⃣  Data to send (same as the curl example)
payload = [
    ["cello", "B4", 1000, 2000],
    ["saxophone", "B4", 1400, 1000]
]

# 4️⃣  Make the POST request and stream the binary response
response = requests.post(
    url,
    data=json.dumps(payload),   # convert Python list → JSON string
    stream=True                 # important for large binary files
)

# 5️⃣  Check for errors
response.raise_for_status()    # will raise an exception if the status isn’t 2xx

# 6️⃣  Write the WAV data to a file
with open("output.wav", "wb") as f:
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:                # skip keep‑alive chunks
            f.write(chunk)

print("✅ Saved WAV as output.wav")
