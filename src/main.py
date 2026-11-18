from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

import backend_functions

HOST = "0.0.0.0"
PORT = 3000

app = FastAPI(title="DumDumDaw")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_DIR = Path(__file__).parent
WEB_COMPONENTS_DIR = APP_DIR / "web_components"
IMAGES_DIR = APP_DIR / "images"

app.mount(
    "/web_components", StaticFiles(directory=WEB_COMPONENTS_DIR), name="web_components"
)
app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")


@app.get("/", response_class=HTMLResponse)
def index():
    index_file_path = WEB_COMPONENTS_DIR / "index.html"
    content = index_file_path.read_text(encoding="utf-8")
    return HTMLResponse(content)


@app.get("/sequencer")
def sequencer():
    index_file_path = WEB_COMPONENTS_DIR / "sequencer.html"
    content = index_file_path.read_text(encoding="utf-8")
    return HTMLResponse(content)


@app.get("/pianoroll")
def pianoroll():
    index_file_path = WEB_COMPONENTS_DIR / "pianoroll.html"
    content = index_file_path.read_text(encoding="utf-8")
    return HTMLResponse(content)


@app.get("/get_instruments")
async def get_instruments():
    return backend_functions.get_instruments()


@app.post("/get_note", response_class=FileResponse)
async def get_note(request: backend_functions.NoteRequest):
    return backend_functions.get_note(request)


@app.post("/play_block", response_class=FileResponse)
async def play_block(request: backend_functions.BlockPlayRequest):
    return backend_functions.play_block(request)


@app.post("/play_main", response_class=FileResponse)
async def play_main(fingerprint: str):
    return backend_functions.play_main(fingerprint)


@app.post("/add_track_instrument")
def add_track_instrument(request: backend_functions.TrackInstrumentRequest):
    return backend_functions.add_track_instrument(request)


@app.get("/get_track_instruments")
def get_track_instruments(fingerprint: str):
    return backend_functions.get_track_instruments(fingerprint)


@app.post("/save_block")
def save_block(request: backend_functions.BlockSaveRequest):
    return backend_functions.save_block(request)


@app.post("/save_block_to_main")
def save_block_to_main(request: backend_functions.MainSaveRequest):
    return backend_functions.save_block_to_main(request)


@app.get("/get_block")
def get_block(name: str, fingerprint: str):
    return backend_functions.get_block(name, fingerprint)


@app.get("/get_main")
def get_main(fingerprint: str):
    return backend_functions.get_main(fingerprint)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
