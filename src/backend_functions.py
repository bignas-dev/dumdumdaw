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

AUDIO_CACHE = {}

SAMPLE_RATE = 44100
SAMPLES_DIR = Path(__file__).parent / "samples"
MAX_DURATION = 1_000_000


def get_audio_segment(inst: str, note: str, sample_rate: int) -> AudioSegment:
    cache_key = (inst, note)
    if cache_key in AUDIO_CACHE:
        return AUDIO_CACHE[cache_key]

    sample_path = SAMPLES_DIR / inst / f"{note}.wav"

    if not sample_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Sample not found: {inst}/{note}.wav"
        )

    try:
        audio = AudioSegment.from_file(sample_path)
    except CouldntDecodeError:
        raise HTTPException(status_code=500, detail="Audio decoding failed")

    if audio.frame_rate != sample_rate:
        audio = audio.set_frame_rate(sample_rate)

    AUDIO_CACHE[cache_key] = audio
    return audio


def generate_music(
    sequence: list[tuple[str, str, float, float]],
):
    SILENCE_FILENAME = "silence.opus"

    if not sequence:
        temp_dir = Path(tempfile.mkdtemp())
        output_path = temp_dir / SILENCE_FILENAME

        AudioSegment.silent(duration=50, frame_rate=SAMPLE_RATE).export(
            output_path, format="opus", parameters=["-b:a", "128k"]
        )

        return FileResponse(
            path=output_path,
            media_type="audio/opus",
            filename=SILENCE_FILENAME,
            background=BackgroundTask(shutil.rmtree, temp_dir),
        )

    max_end = 0
    validated_sequence = []

    for inst, note, start, end in sequence:
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

        validated_sequence.append((inst, note, start, end - start))

    output = AudioSegment.silent(duration=max_end, frame_rate=SAMPLE_RATE)

    for inst, note, start, length in validated_sequence:
        audio = get_audio_segment(inst, note, SAMPLE_RATE)

        original_length = len(audio)

        if original_length > length:
            audio_segment = audio[:length]
        elif original_length < length:
            repeats = int(np.ceil(length / original_length))
            audio_segment = (audio * repeats)[:length]
        else:
            audio_segment = audio

        output = output.overlay(audio_segment, position=start)

    temp_dir = Path(tempfile.mkdtemp())
    output_path = temp_dir / "music.opus"
    output.export(output_path, format="opus", parameters=["-b:a", "128k"])

    return FileResponse(
        path=output_path,
        media_type="audio/opus",
        filename="music.opus",
        background=BackgroundTask(shutil.rmtree, temp_dir),
    )


_INSTRUMENT_DATA_CACHE = None


def get_instruments():
    global _INSTRUMENT_DATA_CACHE
    if _INSTRUMENT_DATA_CACHE is not None:
        return _INSTRUMENT_DATA_CACHE

    instrument_data = defaultdict(list)

    try:
        instruments = sorted(
            [p for p in SAMPLES_DIR.iterdir() if p.is_dir()], key=lambda p: p.name
        )
    except FileNotFoundError:
        _INSTRUMENT_DATA_CACHE = instrument_data
        return instrument_data

    for instrument in instruments:
        instrument_name = instrument.name

        try:
            notes = sorted(
                [p for p in instrument.iterdir() if p.is_file()], key=lambda p: p.name
            )
        except FileNotFoundError:
            continue

        for note in notes:
            note_name = note.stem
            instrument_data[instrument_name].append(note_name)

    _INSTRUMENT_DATA_CACHE = instrument_data
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


def get_block(name, fingerprint):
    return blocks[fingerprint][name]


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
