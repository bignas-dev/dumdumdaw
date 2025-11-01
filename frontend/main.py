from nicegui import ui, app
from fastapi import Request

from pathlib import Path
from fastapi.staticfiles import StaticFiles
import time

# Create path relative to current file
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)

# Mount static directory
app.mount("/static", StaticFiles(directory=static_dir), name="static")

"""
# ensure static directory exists
Path('static').mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
"""
def include_static_assets(js_files=None, css_files=None):
    """Adds given JS and CSS files to the current NiceGUI page with version cache-busting."""
    js_files = js_files or []
    css_files = css_files or []
    version = int(time.time())  # forces browser to fetch latest on each run
    for css in css_files:
        ui.add_head_html(f'<link rel="stylesheet" href="/static/{css}?v={version}">')
    for js in js_files:
        ui.add_body_html(f'<script src="/static/{js}?v={version}"></script>')




# set'as (duomenų rinkinys), skirtas rinkti dedamų natų duomenims (aktualu backendui):
track_note_data = {}

@ui.page('/')
def sequencer_page():

    include_static_assets(js_files=['sequencer_page.js'], css_files=['sequencer_page.css'])

    # čia html <head> elemento papildomas kodas. Kol kas čia tik įvairių html elementų stiliai (prie kiekvieno nurodyta kieno tiksliai).
    sequencerPuslapioHeadHtml = ui.add_head_html('''
    <style>
        <link rel="stylesheet" href="/static/sequencer_page.css">
    </style>
    ''')

    sequencerKodas = ui.add_body_html("""

        <!-- flex-direction:row padaro, kad labelų ir sequencerio dalys rikiuotųsi eilute, ne stulpeliu (ne vertikaliai viens po kitu); justify-content:center padaro, kad visa labelų ir sequencerio visuma būtų horizontaliai vidury, o ne kairėj ar dar kur -->
        <!-- HEIGHT APRIBOJA TAI, KIEK SEQUENCERIO AUKŠČIO MATOM (LANGO AUKŠTIS);  OVERFLOW-Y:AUTO NUMATO SCROLL FUNKCIJĄ SEQUENCERIUI;  NUSTATOM BACKGROUND SPALVĄ #202020, KAD NESIMATYTŲ TARPO TARP SEQUENCER LANGO IR JO SCROLLBARO, JEIGU SCROLLBARAS NELYGUS 15PX (JEIGU KOKS BROWSERIS NEKLAUSO MŪSŲ 15PX SCROLLBAR WIDTH/HEIGHT NUSTATYMO) -->
        <!-- width = 1070px, nes 170(labelai)+900(trackų matomoji dalis). Į scrollbaro plotį (15px) atsižvelgt nebūtina, tai dėl to ne 1085. -->
        <div id="whole-sequencer-container" style="display:flex; flex-direction:row; justify-content:center; margin-top: 50px !important; height: 550px; overflow-y:auto; width: 1070px; margin: auto; border-radius: 10px 0px 0px 10px;">
            <!-- LEFT LABELS (BENDRAI VISI LABELAI) -->
            <div id="labels" style="display:flex; flex-direction:column; width: 170px; background:#202020; color:#eee; font-family:Century Gothic; border-radius:10px 0px 0px 10px;"></div>

            <!-- MAIN SEQUENCER CONTAINER (BENDRAI VISŲ TRACKŲ SKILTIS) ||| OVERFLOW-Y:HIDDEN NELEIDŽIA SEQUENCER-CONTAINER ELEMENTUI SUSIKURT SAVO PATIES SCROLLO, MUM JO NEREIKIA, MUM REIKIA, KAD SEQUENCERIO TRACKŲ LABELAI IR PATYS TRACKAI JUDĖTŲ KARTU! -->
            <div id="sequencer-container" style="width:900px; overflow-x:auto; overflow-y: hidden; padding-bottom:10px;">
                <!-- VISAS SEQUENCERIS (IR TA DALIS, KURI NESIMATO SEQUENCERIO LANGE) -->
                <div id="sequencer" style="width:2500px; background:#111; position:relative;"></div>
            </div>
        </div>

                                                                     
    <script src="/static/sequencer_page.js"></script>                                  
    """)



# pianoroll puslapis (atidaro naujam tabe)
@ui.page("/pianoroll")
def pianoroll_page(track: int):

    include_static_assets(js_files=['pianoroll_page.js'], css_files=['pianoroll_page.css'])

    ui.label(f"This is the pianoroll for Track {track}")
    ui.button("back to sequencer", on_click=lambda: ui.navigate.to("/"))

    # čia html <head> elemento papildomas kodas. Kol kas čia tik įvairių html elementų stiliai (prie kiekvieno nurodyta kieno tiksliai).
    pianorollPuslapioHeadHtml = ui.add_head_html('''
    <style>
        <link rel="stylesheet" href="/static/pianoroll_page.css">
    </style>
    ''')


    pianorollKodas = ui.add_body_html("""

    <!-- flex-direction:row padaro, kad labelų ir sequencerio dalys rikiuotųsi eilute, ne stulpeliu (ne vertikaliai viens po kitu); justify-content:center padaro, kad visa labelų ir sequencerio visuma būtų horizontaliai vidury, o ne kairėj ar dar kur -->
    <!-- HEIGHT APRIBOJA TAI, KIEK PIANOROLLO AUKŠČIO MATOM (LANGO AUKŠTIS);  OVERFLOW-Y:AUTO NUMATO SCROLL FUNKCIJĄ PIANOROLLUI;  NUSTATOM BACKGROUND SPALVĄ #202020, KAD NESIMATYTŲ TARPO TARP PIANOROLL LANGO IR JO SCROLLBARO, JEIGU SCROLLBARAS NELYGUS 15PX (JEIGU KOKS BROWSERIS NEKLAUSO MŪSŲ 15PX SCROLLBAR WIDTH/HEIGHT NUSTATYMO) -->
    <!-- width = 950px, nes 50(labelai)+900(natų eilių matomoji dalis). Į scrollbaro plotį (15px) atsižvelgt nebūtina, tai dėl to ne 965. -->
    <div id="whole-pianoroll-container" style="display:flex; flex-direction:row; justify-content:center; margin-top: 50px !important; height: 550px; overflow-y:auto; width: 950px; margin: auto; border-radius: 10px 0px 0px 10px;">
        <!-- LEFT LABELS (BENDRAI VISI LABELAI) -->
        <div id="labels" style="display:flex; flex-direction:column; width: 50px; background:#202020; color:#eee; font-family:Century Gothic;">
        </div>

        <!-- MAIN SEQUENCER CONTAINER (BENDRAI VISŲ TRACKŲ SKILTIS) ||| OVERFLOW-Y:HIDDEN NELEIDŽIA SEQUENCER-CONTAINER ELEMENTUI SUSIKURT SAVO PATIES SCROLLO, MUM JO NEREIKIA, MUM REIKIA, KAD PIANOROLL EILUČIŲ LABELAI IR PAČIOS EILUTĖS JUDĖTŲ KARTU! -->
        <div id="sequencer-container" style="width:900px; overflow-x:auto; overflow-y:hidden;">
            <!-- VISAS SEQUENCERIS (IR TA DALIS, KURI NESIMATO SEQUENCERIO LANGE) -->
            <div id="sequencer" style="width:2500px; background:#111; position:relative;"></div>
        </div>
    </div>
                                                                     
    <script src="/static/pianoroll_page.js"></script>                               
    """)




# --- Backend endpoint to generate pianoroll URL ---
@app.get("/api/get-pianoroll-url")
def get_pianoroll_url(track: int):
    """Return URL for the specific track’s pianoroll page."""
    return {"url": f"/pianoroll?track={track}"}



# funkcija rinkti duomenis backend'ui:
@app.post('/update_tracks')
async def update_tracks(request: Request):
    global track_note_data
    track_note_data = await request.json()
    print(track_note_data)  # print to console for debugging
    return {'status': 'ok'}

ui.run()