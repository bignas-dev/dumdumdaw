from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
import numpy as np
import tempfile
import shutil
from pathlib import Path

app = FastAPI(title="DAW Audio Renderer")

SAMPLE_RATE = 44100
SAMPLES_DIR = Path(__file__).parent / "samples"
MAX_DURATION = 1_000_000


@app.post("/get_music", response_class=FileResponse)
async def get_music(
    sequence: list[tuple[str, str, float, float]],
):
    if not sequence:
        raise HTTPException(status_code=400, detail="Sequence is empty")

    max_end = 0
    validated_sequence = []
    for inst, note, start, length in sequence:
        if start < 0 or length <= 0:
            raise HTTPException(
                status_code=400, detail=f"Invalid start/length: {start}, {length}"
            )
        end = start + length
        if end > MAX_DURATION:
            raise HTTPException(
                status_code=400, detail=f"Audio too long (> {MAX_DURATION}s)"
            )
        max_end = max(max_end, end)

        sample_path = SAMPLES_DIR / inst / f"{note}.wav"

        if not sample_path.exists():
            raise HTTPException(
                status_code=404, detail=f"Sample not found: {sample_path}"
            )

        validated_sequence.append((sample_path, start, length))

    output = AudioSegment.silent(duration=max_end, frame_rate=SAMPLE_RATE)

    for sample_path, start, length in validated_sequence:
        try:
            audio = AudioSegment.from_file(sample_path)
        except CouldntDecodeError:
            raise HTTPException(status_code=500, detail=f"Cannot decode: {sample_path}")

        if audio.frame_rate != SAMPLE_RATE:
            audio = audio.set_frame_rate(SAMPLE_RATE)

        if len(audio) > length:
            audio = audio[:length]

        elif len(audio) < length:
            repeats = int(np.ceil(length / len(audio)))
            audio = (audio * repeats)[:length]

        output = output.overlay(audio, position=start)

    temp_dir = Path(tempfile.mkdtemp())
    output_path = temp_dir / "return.wav"
    output.export(output_path, format="wav")

    return FileResponse(
        path=output_path,
        media_type="audio/wav",
        filename="return.wav",
        background=BackgroundTask(shutil.rmtree, temp_dir),
    )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=6767)
