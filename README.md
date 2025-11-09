# MEILIU & CO.

Vytenis.

## TO-DO List

- [ ] Make a TO-DO list

## BACKENDAS

Backendas grąžina .wav muzikos failą pagal pateiktus kriterijus.  
Minimalus veiksnumas – vienas endpointas **POST** `/get_music`.

### Backendo dokumentacija

#### Paleidimas

```bash
uv sync
uv run backend/main.py
```

#### Endpointas

- **URL:** `http://127.0.0.1:6767/get_music`
- **Metodas:** `POST`
- **Payload:** JSON masyvas, tipas `list[tuple[str, str, float, float]]`

```json
[
  ["instrument", "note", start, length],
  ["instrument", "note", start, length],
  ...
]
```

| Laukas      | Tipas   | Aprašymas |
|-------------|---------|-----------|
| `instrument`| `str`   | Instrumento pavadinimas. Tinka subfolderiams `backend/samples`. Galimi pavadinimai: `bass-electric`, `bassoon`, `cello`, `clarinet`, `contrabass`, `flute`, `french-horn`, `guitar-acoustic`, `guitar-electric`, `guitar-nylon`, `harmonium`, `harp`, `organ`, `piano`, `saxophone`, `trombone`, `trumpet`, `tuba`, `violin`, `xylophone`. |
| `note`      | `str`   | Nata, pvz. `"B4"`, `"C2"` – ne visi instrumentai turi visas natų rinkinius. |
| `start`     | `float` | Pradžios laikas **ms** (kada nata pradeda groti). |
| `length`    | `float` | Trukmė **ms** (kiek laiko nata groja). |

**Atsakymas:** .wav failas su sugeneruota muzika.

### Pavyzdys – Python kodas, kuris išsaugo sugeneruotą .wav failą

```python
import json
import requests

# 1️⃣  Endpointas
url = "http://127.0.0.1:6767/get_music"

# 2️⃣  Duomenys (toks pat kaip curl pavyzdyje)
payload = [
    ["cello", "B4", 1000, 2000],
    ["saxophone", "B4", 1400, 1000]
]

# 3️⃣  Siunčiame POST užklausą, transliuojame atsakymą
response = requests.post(
    url,
    data=json.dumps(payload),   # Python sąrašas → JSON eilutė
    stream=True                 # svarbu dideliems binariniams failams
)

# 4️⃣  Patikriname, ar viskas gerai
response.raise_for_status()    # iškelia išimtį, jei statusas ne 2xx

# 5️⃣  Įrašome WAV duomenis į failą
with open("output.wav", "wb") as f:
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:                # praleidžiame „keep‑alive“ tuščius chunkus
            f.write(chunk)

print("✅ WAV failas išsaugotas kaip output.wav")
```

> **Pastaba:** Prieš vykdant šį kodą įsitikinkite, kad backendas veikia (`uv run backend/main.py`).
