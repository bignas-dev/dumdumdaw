from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
import backend_functions


SAMPLE_RATE = 44100
MAX_DURATION = 1_000_000

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


class NoteRequest(BaseModel):
    instrument: str
    note: str


class PlayBlockRequest(BaseModel):
    sequence: list[tuple[str, str, float, float]]


class SaveBlockRequest(BaseModel):
    name: str
    sequence: list[tuple[str, str, float, float]]


class SaveMainRequest(BaseModel):
    sequence: list[tuple[str, float, float]]


class AddToMainRequest(BaseModel):
    name: str
    start: float
    end: float


class AddTrackInstrument(BaseModel):
    track_nr: int
    instrument: str


class SaveBlockToMain(BaseModel):
    name: str
    start: float
    end: float


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
def pianoroll(track: int):
    index_file_path = WEB_COMPONENTS_DIR / "pianoroll.html"
    content = index_file_path.read_text(encoding="utf-8")
    return HTMLResponse(content)


@app.get("/get_instruments")
def get_instruments():
    return backend_functions.get_instruments()


@app.post("/get_note", response_class=FileResponse)
def get_note(request: NoteRequest):
    return backend_functions.get_note(request)


@app.post("/add_track_instrument")
def add_track_instrument(request: AddTrackInstrument):
    return backend_functions.add_track_instrument(request)


@app.get("/get_track_instruments")
def get_track_instruments():
    return backend_functions.get_track_instruments()


@app.post("/save_block")
def save_block(request: SaveBlockRequest):
    return backend_functions.save_block(request)


@app.post("/add_block_to_main")
def add_block_to_main(request: AddToMainRequest):
    return backend_functions.add_block_to_main(request)


@app.post("/change_block_coordinates")
def change_block_coordinates(request: ChangeBlockCoordinates):
    return backend_functions.change_block_coordinates(request)


@app.post("/save_block_changes_to_main")
def save_block_changes_to_main(request: AddToMainRequest):
    return backend_functions.save_block_changes_to_main(request)


@app.get("/get_block")
def get_block(name: str):
    return backend_functions.get_block(name)


@app.post("/play_block", response_class=FileResponse)
def play_block(request: PlayBlockRequest):
    return backend_functions.play_block(request)


@app.post("/save_main")
def save_main(request: SaveMainRequest):
    return backend_functions.save_main(request)


@app.get("/get_main")
def get_main():
    return backend_functions.get_main()


@app.post("/play_main", response_class=FileResponse)
def play_main():
    return backend_functions.play_main()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=6767)
