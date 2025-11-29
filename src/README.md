# DAW Audio Renderer API Guide

**Base URL**: `http://localhost:6767`

Dalis sito sugeneruota AI

---

## Setup Requirements
1. **Dependencies**:
   ```bash
   uv sync
   ```

2. **Run the Server**:
   ```bash
   uv run main.py
   ```

---

## API Endpoints

### 1. Get Single Note
Render a single note from an instrument sample.

> Cia reikalingas, nes Vytenis nori, kad kai padeda nata iskart groja.

**Endpoint**:  
`POST /get_note`

**Parameters**:
- `instrument` (string, required): Instrument name (e.g., "piano")
- `note` (string, required): Note name (e.g., "C4")

**Response**:  
WAV audio file (`audio/wav`)

```python
import requests

response = requests.post(
    "http://localhost:6767/get_note",
    params={"instrument": "guitar", "note": "E3"}
)
with open("E3.wav", "wb") as f:
    f.write(response.content)
```

---

### 2. Save Note Block
Save a reusable sequence of notes as a named block.

> Cia tu issaugoji blocko vidurius, kai useris exitina is pianorollo, note tau reikia sugalvoti (sugeneruoti) pavadinima, kuris nesikartotu pvz.: dabartini laika pakeisti str ar pns

**Endpoint**:  
`POST /save_block`

**Parameters**:
- `name` (string, required): Block identifier (e.g., "chord_C")
- `sequence` (JSON array, required): List of note events in format:  
  `[instrument, note, start_time_ms, end_time_ms]`

**Response**:  
`{"status": "saved"}`

```python
import requests

sequence = [
    ["piano", "C4", 0, 500],
    ["piano", "E4", 0, 500],
    ["piano", "G4", 0, 500]
]

requests.post(
    "http://localhost:6767/save_block",
    params={"name": "chord_C"},
    json=sequence
)
```

---

### 3. Get Saved Block
Retrieve a previously saved block configuration.

> Cia kai tu atidarai instumento bloka, tai cia visa info apie jo vidurius, tau reikia tureti to blocko pavadinima

**Endpoint**:  
`GET /get_block`

**Parameters**:
- `name` (string, required): Block name to retrieve

**Response**:  
JSON array of the block's note sequence

**Example**:
```bash
curl "http://localhost:6767/get_block?name=chord_C"
```

```json
[
  ["piano", "C4", 0, 500],
  ["piano", "E4", 0, 500],
  ["piano", "G4", 0, 500]
]
```

---

### 4. Play Saved Block
Render and download a saved block as audio.

> Playini bloka, reikia bloko pavadinimo

**Endpoint**:  
`POST /play_block`

**Parameters**:
- `name` (string, required): Block name to render

**Response**:  
WAV audio file (`audio/wav`)

**Example**:
```bash
curl -X POST "http://localhost:6767/play_block?name=chord_C" --output chord_C.wav
```

---

### 5. Save Main Composition
Save the main composition sequence that references blocks.

> Cia tu issaugoji savo main compozicija, pries tai kai pereini prie specifinio bloko editinimo

**Endpoint**:  
`POST /save_main`

**Parameters**:
- `sequence` (JSON array, required): List of block events in format:  
  `[block_name, start_time_ms, duration_ms]`

**Response**:  
`{"status": "main saved"}`

**Example**:
```bash
curl -X POST "http://localhost:6767/save_main" \
  -H "Content-Type: application/json" \
  -d '[
        ["chord_C", 0, 1000],
        ["chord_F", 1000, 1000],
        ["chord_G", 2000, 1000]
      ]'
```

---

### 6. Get Main Composition
Retrieve the current main composition sequence.

> Kai grizti atgal prie maino ir tau reikia duomenu, tai reikia pacallinti sita

**Endpoint**:  
`GET /get_main`

**Response**:  
JSON array of the main sequence

**Example**:
```bash
curl "http://localhost:6767/get_main"
```

```json
[
  ["chord_C", 0, 1000],
  ["chord_F", 1000, 1000],
  ["chord_G", 2000, 1000]
]
```

---

### 7. Play Main Composition
Render and download the entire composition as audio.

> Playini visa kurini, simple

**Endpoint**:  
`POST /play_main`

**Parameters**:  
None

**Response**:  
WAV audio file (`audio/wav`)

**Example**:
```bash
curl -X POST "http://localhost:6767/play_main" --output composition.wav
```

---

## Error Handling
The API returns standard HTTP status codes with descriptive JSON errors:

| Status Code | Error Condition                          | Example Response                                  |
|-------------|------------------------------------------|--------------------------------------------------|
| 400         | Invalid parameters/timing                | `{"detail": "Invalid timing: start=-10, end=400"}` |
| 404         | Sample not found                         | `{"detail": "Sample not found: synth/A#3.wav"}` |
| 404         | Block not found                          | `{"detail": "Block 'invalid' not found"}`       |
| 404         | Block missing in main sequence           | `{"detail": "Block 'missing' not found in main sequence"}` |
| 500         | Audio processing failure                 | `{"detail": "Audio decoding failed"}`           |

---

## Composition Workflow Example
1. **Save individual blocks**:
   ```bash
   # Save C major chord
   curl -X POST "http://localhost:6767/save_block?name=C_chord" -H "Content-Type: application/json" -d '[["piano","C4",0,500],["piano","E4",0,500],["piano","G4",0,500]]'
   
   # Save F major chord
   curl -X POST "http://localhost:6767/save_block?name=F_chord" -H "Content-Type: application/json" -d '[["piano","F4",0,500],["piano","A4",0,500],["piano","C5",0,500]]'
   ```

2. **Create main composition**:
   ```bash
   curl -X POST "http://localhost:6767/save_main" -H "Content-Type: application/json" -d '[["C_chord",0,1000],["F_chord",1000,1000],["C_chord",2000,1000]]'
   ```

3. **Render final composition**:
   ```bash
   curl -X POST "http://localhost:6767/play_main" --output song.wav
   ```

---

## Important Constraints
1. **Timing Values**:
   - All times in milliseconds (ms)
   - Must have `start >= 0`, `end > start`, `end <= 1,000,000`
   - Block duration must be positive

2. **Audio Specifications**:
   - Sample rate: 44.1 kHz
   - Output format: WAV (PCM 16-bit)
   - Maximum composition duration: ~16.7 minutes (1,000,000 ms)

3. **File Management**:
   - Temporary files are automatically cleaned up after download
   - Sample files must be in WAV format
   - No path traversal allowed (samples must be in `samples/` directory)

4. **State Management**:
   - Blocks and main sequence are stored in memory
   - Server restart clears all saved blocks/compositions
   - Not suitable for production without persistent storage

---
