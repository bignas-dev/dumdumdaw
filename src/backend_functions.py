import shutil
from collections import defaultdict
import tempfile
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
from starlette.background import BackgroundTask
import numpy as np

SAMPLE_RATE = 44100
SAMPLES_DIR = Path(__file__).parent / "samples"
MAX_DURATION = 1_000_000

blocks = {}
main = {}
track_instruments = {}


def generate_music(
    sequence: list[tuple[str, str, float, float]],
):
    if not sequence:
        raise HTTPException(status_code=400, detail="Empty sequence")

    max_end = 0
    validated_sequence = []
    for (inst, note, start, end) in sequence:
        if start < 0 or end <= 0 or end <= start:
            raise HTTPException(
                status_code=400, detail=f"Invalid timing: start={start}, end={end}"
            )

        if end > MAX_DURATION:
            raise HTTPException(
                status_code=400,
                detail=f"Audio too long: {end}ms exceeds max {MAX_DURATION}ms",
            )

        max_end = max(max_end, end)

        sample_path = SAMPLES_DIR / inst / f"{note}.wav"

        if not sample_path.exists():
            raise HTTPException(
                status_code=404, detail=f"Sample not found: {inst}/{note}.wav"
            )

        validated_sequence.append((sample_path, start, end - start))

    output = AudioSegment.silent(duration=max_end, frame_rate=SAMPLE_RATE)

    for sample_path, start, length in validated_sequence:
        try:
            audio = AudioSegment.from_file(sample_path)
        except CouldntDecodeError:
            raise HTTPException(status_code=500, detail="Audio decoding failed")

        if audio.frame_rate != SAMPLE_RATE:
            audio = audio.set_frame_rate(SAMPLE_RATE)

        if len(audio) > length:
            audio = audio[:length]
        elif len(audio) < length:
            repeats = int(np.ceil(length / len(audio)))
            audio = (audio * repeats)[:length]

        output = output.overlay(audio, position=start)

    temp_dir = Path(tempfile.mkdtemp())
    output_path = temp_dir / "music.wav"
    output.export(output_path, format="wav")

    return FileResponse(
        path=output_path,
        media_type="audio/wav",
        filename="music.wav",
        background=BackgroundTask(shutil.rmtree, temp_dir),
    )


def get_instruments():
    instrument_data = defaultdict(list)

    if not SAMPLES_DIR.exists() or not SAMPLES_DIR.is_dir():
        return instrument_data

    for instrument in sorted(SAMPLES_DIR.iterdir(), key=lambda p: p.name):
        if not instrument.is_dir():
            continue

        instrument_name = instrument.name

        for note in sorted(instrument.iterdir(), key=lambda p: p.name):
            if not note.is_file():
                continue

            note_name = note.stem
            instrument_data[instrument_name].append(note_name)

    return instrument_data


def get_note(request):
    return generate_music([(request.instrument, request.note, 0, 500)])


def add_track_instrument(request):
    track_instruments[request.track_nr] = request.instrument
    return {"status": "added"}


def get_track_instruments():
    return track_instruments


def save_block(request):
    blocks[request.name] = request.sequence
    return {"status": "saved"}


def save_block_to_main(request):
    main[request.name] = [request.start, request.end]
    return {"status": "success"}

def get_block(name):
    if name not in blocks:
        raise HTTPException(status_code=404, detail=f"Block '{name}' not found")
    return blocks[name]


def play_block(request):
    return generate_music(request.sequence)


def save_main(request):
    global main
    main = request.sequence
    return {"status": "main saved"}


def get_main():
    return main


def play_main():
    for block_ref in main:
        block_name = block_ref[0]
        if block_name not in blocks:
            raise HTTPException(
                status_code=404,
                detail=f"Block '{block_name}' not found in main sequence",
            )

    temp_seq = []
    for block in main:
        for insides in blocks[block[0]]:
            local_start = insides[2]
            local_end = insides[3]
            global_start = block[1]
            global_end = block[2]
            new_start = local_start + global_start
            new_end = min(local_end + global_start, global_end)
            temp_seq.append((insides[0], insides[1], new_start, new_end))

    return generate_music(temp_seq)
