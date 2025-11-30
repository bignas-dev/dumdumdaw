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


def generate_music(
    sequence: list[tuple[str, str, float, float]],
):
    if not sequence:
        temp_dir = Path(tempfile.mkdtemp())
        output_path = temp_dir / "silence.wav"
        AudioSegment.silent(duration=50, frame_rate=SAMPLE_RATE).export(
            output_path, format="wav"
        )

        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename="silence.wav",
            background=BackgroundTask(shutil.rmtree, temp_dir),
        )

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


track_instruments = defaultdict(lambda: defaultdict(str))
blocks = defaultdict(lambda: defaultdict(list))
main = defaultdict(lambda: defaultdict(list))


def get_note(request):
    return generate_music([(request.instrument, request.note, 0, 500)])


def add_track_instrument(request):
    track_instruments[request.fingerprint][request.track_nr] = request.instrument
    return {"status": "added"}


def get_track_instruments(fingerprint):
    return track_instruments[fingerprint]


def save_block(request):
    blocks[request.fingerprint][request.name] = request.sequence
    return {"status": "saved"}


def save_block_to_main(request):
    main[request.fingerprint][request.name] = [request.start, request.end]
    return {"status": "saved"}


def get_block(request):
    return blocks[request.fingerprint][request.name]


def play_block(request):
    return generate_music(request.sequence)


def get_main(fingerprint):
    user_data = main[fingerprint]  
    
    return [[key, *values] for key, values in user_data.items()]


def play_main(fingerprint):
    temp_seq = []

    user_main = main.get(fingerprint)
    user_blocks = blocks.get(fingerprint)

    if not user_main or not user_blocks:
        return generate_music([])  

    for block_name, block_position in user_main.items():
        if block_name in user_blocks:
            
            note_sequence = user_blocks[block_name]
            
            global_start = block_position[0]
            global_end = block_position[1]

            for note_data in note_sequence:
                
                inst, note, local_start, local_end = note_data
                
                new_start = local_start + global_start
                new_end = min(local_end + global_start, global_end)
                
                temp_seq.append((inst, note, new_start, new_end))

    return generate_music(temp_seq)
