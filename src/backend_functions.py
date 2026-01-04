import sqlite3
import json
import shutil
import tempfile
from pathlib import Path
from contextlib import contextmanager
import numpy as np
from fastapi import HTTPException
from fastapi.responses import FileResponse
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
from starlette.background import BackgroundTask
from dataclasses import dataclass
from collections import defaultdict

SAMPLE_RATE = 44100
SAMPLES_DIR = Path(__file__).parent / "samples"
MAX_DURATION = 1_000_000
DB_PATH = Path(__file__).parent / "database" / "music_data.db"

AUDIO_CACHE = {}


@dataclass
class NoteRequest:
    instrument: str
    note: str


@dataclass
class TrackInstrumentRequest:
    fingerprint: str
    track_nr: int
    instrument: str


@dataclass
class BlockSaveRequest:
    fingerprint: str
    name: str
    sequence: list[tuple[str, str, float, float]]


@dataclass
class MainSaveRequest:
    fingerprint: str
    name: str
    start: float
    end: float


@dataclass
class BlockPlayRequest:
    sequence: list[tuple[str, str, float, float]]


def init_database():
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS track_instruments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fingerprint TEXT NOT NULL,
                track_nr INTEGER NOT NULL,
                instrument TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fingerprint, track_nr)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS blocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fingerprint TEXT NOT NULL,
                name TEXT NOT NULL,
                sequence_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fingerprint, name)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS main (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fingerprint TEXT NOT NULL,
                block_name TEXT NOT NULL,
                start_time REAL NOT NULL,
                end_time REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fingerprint, block_name)
            )
        """)

        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_fingerprint ON track_instruments(fingerprint)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_blocks_fingerprint ON blocks(fingerprint)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_main_fingerprint ON main(fingerprint)"
        )

        conn.commit()


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(
        DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
    )
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


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


def generate_music(sequence: list[tuple[str, str, float, float]]):
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


def get_note(request: NoteRequest):
    return generate_music([(request.instrument, request.note, 0, 500)])


def add_track_instrument(request: TrackInstrumentRequest):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO track_instruments 
            (fingerprint, track_nr, instrument, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """,
            (request.fingerprint, request.track_nr, request.instrument),
        )
        conn.commit()
    return {"status": "added"}


def get_track_instruments(fingerprint: str) -> dict[int, str]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT track_nr, instrument 
            FROM track_instruments 
            WHERE fingerprint = ?
            ORDER BY track_nr
        """,
            (fingerprint,),
        )

        result = {}
        for row in cursor.fetchall():
            result[row["track_nr"]] = row["instrument"]
        return result


def save_block(request: BlockSaveRequest):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        sequence_json = json.dumps(request.sequence)

        cursor.execute(
            """
            INSERT OR REPLACE INTO blocks 
            (fingerprint, name, sequence_json, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """,
            (request.fingerprint, request.name, sequence_json),
        )
        conn.commit()
    return {"status": "saved"}


def get_block(
    name: str, fingerprint: str
) -> list[tuple[str, str, float, float]] | None:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT sequence_json 
            FROM blocks 
            WHERE fingerprint = ? AND name = ?
        """,
            (fingerprint, name),
        )

        row = cursor.fetchone()
        if row:
            return json.loads(row["sequence_json"])
        return None


def save_block_to_main(request: MainSaveRequest):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO main 
            (fingerprint, block_name, start_time, end_time)
            VALUES (?, ?, ?, ?)
        """,
            (request.fingerprint, request.name, request.start, request.end),
        )
        conn.commit()
    return {"status": "saved"}


def get_main(fingerprint: str) -> list[list]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT block_name, start_time, end_time
            FROM main 
            WHERE fingerprint = ?
            ORDER BY start_time
        """,
            (fingerprint,),
        )

        result = []
        for row in cursor.fetchall():
            result.append([row["block_name"], row["start_time"], row["end_time"]])
        return result


def play_block(request: BlockPlayRequest):
    return generate_music(request.sequence)


def play_main(fingerprint: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT m.block_name, m.start_time, m.end_time, b.sequence_json
            FROM main m
            LEFT JOIN blocks b ON m.fingerprint = b.fingerprint AND m.block_name = b.name
            WHERE m.fingerprint = ?
            ORDER BY m.start_time
        """,
            (fingerprint,),
        )

        temp_seq = []

        for row in cursor.fetchall():
            if not row["sequence_json"]:
                continue

            sequence = json.loads(row["sequence_json"])
            global_start = row["start_time"]
            global_end = row["end_time"]

            for note_data in sequence:
                inst, note, local_start, local_end = note_data
                new_start = local_start + global_start
                new_end = min(local_end + global_start, global_end)
                temp_seq.append((inst, note, new_start, new_end))

    return generate_music(temp_seq)


def get_user_stats(fingerprint: str) -> dict[str, float]:
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM track_instruments WHERE fingerprint = ?",
            (fingerprint,),
        )
        track_count = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM blocks WHERE fingerprint = ?", (fingerprint,)
        )
        block_count = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM main WHERE fingerprint = ?", (fingerprint,)
        )
        main_count = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT SUM(end_time - start_time) as total_duration
            FROM main 
            WHERE fingerprint = ?
        """,
            (fingerprint,),
        )

        total_duration = cursor.fetchone()[0] or 0

        return {
            "tracks": track_count,
            "blocks": block_count,
            "main_entries": main_count,
            "total_duration_ms": total_duration,
        }


def delete_block(fingerprint: str, name: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM blocks WHERE fingerprint = ? AND name = ?", (fingerprint, name)
        )
        conn.commit()
    return {"status": "deleted"}


def delete_from_main(fingerprint: str, block_name: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM main WHERE fingerprint = ? AND block_name = ?",
            (fingerprint, block_name),
        )
        conn.commit()
    return {"status": "deleted"}


init_database()
