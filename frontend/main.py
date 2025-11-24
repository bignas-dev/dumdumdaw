from nicegui import ui, app
from fastapi import Request

from pathlib import Path
from fastapi.staticfiles import StaticFiles
import time

# Import page3
# from page3 import page3

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
track_note_data = []

@ui.page('/')
def sequencer_page():

    include_static_assets(js_files=['sequencer_page.js'], css_files=['sequencer_page.css'])

    ui.button("landing page", on_click=lambda: ui.navigate.to("/page3"))

    # čia html <head> elemento papildomas kodas.
    sequencerPuslapioHeadHtml = ui.add_head_html('''
    <link rel="stylesheet" href="/static/sequencer_page.css">
    ''')

    sequencerKodas = ui.add_body_html("""

    <header>
        <div style="margin: auto; width: 950px; margin-top: 50px; display: flex; flex-direction: row; justify-content: center; align-items: flex-end; gap: 10px;">
            <img src="/static/logo.svg" alt="logo" width="110" height="130" style="margin-right: 10px;">
            <button id="playButton" class="button square" title="Play"><i class="material-icons" style="font-size:36px;">play_arrow</i></button>
            <button id="pauseButton" class="button square" title="Pause"><i class="material-icons" style="font-size:36px;">pause</i></button>
            <button id="returnButton" class="button square" title="Return"><i class="material-icons" style="font-size:36px;">stop</i></button>
            <button id="selectButton" class="button square" title="Select"><i class="material-icons" style="font-size:36px;">select_all</i></button>
            <button id="duplicateButton" class="button square" title="Duplicate"><i class="material-icons" style="font-size:36px;">content_copy</i></button>
            <button id="exportButton" class="button text" title="Export">Export</button>
            <span class="tempo-labelL">Tempo:</span>
            <input class="tempo-input" type="number" value="120" step = "5"/>
            <span class="tempo-labelR">bpm</span>
        </div>
    </header>
                                      
        <!-- SEQUENCER TURINYS -->
    <div id="whole-sequencer-container" style="display:flex; flex-direction:row; justify-content:center; margin-top: 20px !important; height: 550px; overflow-y:auto; width: 1070px; margin: auto; border-radius: 10px 0px 0px 10px;">
        <div id="labels" style="display:flex; flex-direction:column; width: 170px; background:#202020; color:#eee; font-family:Century Gothic; border-radius:10px 0px 0px 10px;"></div>
        <!-- JEI SEQUENCER-CONTAINER BŪTŲ BE POSITION:RELATIVE, TAI PLAYBACK LINIJA IŠLĮSTŲ IŠ CONTAINERIO IR VERTIKALIAI, IR HORIZONTALIAI -->
        <div id="sequencer-container" style="width:900px; overflow-x:auto; overflow-y:hidden; padding-bottom:10px; position: relative;">
            <div id="sequencer" style="width:10000px; background:#111; position:relative;"></div>
            <div id="playhead"></div>
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
    
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="stylesheet" href="/static/pianoroll_page.css">                                                                                     
                                            
    ''')


    pianorollKodas = ui.add_body_html("""

    <audio id="audio-player"></audio>
    
    <header>
        <div style="margin: auto; width: 950px; margin-top: 50px; margin-bottom: 20px; display: flex; flex-direction: row; justify-content: center; align-items: flex-end; gap: 10px;">
            <img src="/static/logo.svg" alt="logo" width="110" height="130" style="margin-right: 10px;">
            <button id="playButton" class="button square" title="Play"><i class="material-icons" style="font-size:36px;">play_arrow</i></button>
            <button id="pauseButton" class="button square" title="Pause"><i class="material-icons" style="font-size:36px;">pause</i></button>
            <button id="returnButton" class="button square" title="Return"><i class="material-icons" style="font-size:36px;">stop</i></button>
            <button id="selectButton" class="button square" title="Select"><i class="material-icons" style="font-size:36px;">select_all</i></button>
            <button id="duplicateButton" class="button square" title="Duplicate"><i class="material-icons" style="font-size:36px;">content_copy</i></button>
            <p id="instrumentName"></p>
        </div>
    </header>
    
    <!-- flex-direction:row padaro, kad labelų ir pianoroll dalys rikiuotųsi eilute, ne stulpeliu (ne vertikaliai viens po kitu); justify-content:center padaro, kad visa labelų ir sequencerio visuma būtų horizontaliai vidury, o ne kairėj ar dar kur -->
    <!-- HEIGHT APRIBOJA TAI, KIEK PIANOROLLO AUKŠČIO MATOM (LANGO AUKŠTIS);  OVERFLOW-Y:AUTO NUMATO SCROLL FUNKCIJĄ PIANOROLLUI;  NUSTATOM BACKGROUND SPALVĄ #202020, KAD NESIMATYTŲ TARPO TARP PIANOROLL LANGO IR JO SCROLLBARO, JEIGU SCROLLBARAS NELYGUS 15PX (JEIGU KOKS BROWSERIS NEKLAUSO MŪSŲ 15PX SCROLLBAR WIDTH/HEIGHT NUSTATYMO) -->
    <!-- width = 950px, nes 50(labelai)+900(natų eilių matomoji dalis). Į scrollbaro plotį (15px) atsižvelgt nebūtina, tai dėl to ne 965. -->
    <div id="whole-pianoroll-container" style="display:flex; flex-direction:row; justify-content:center; height: 550px; overflow-y:auto; width: 950px; margin: auto; border-radius: 10px 0px 0px 10px;">
        <!-- LEFT LABELS (BENDRAI VISI LABELAI) -->
        <div id="pitchLabels" style="display:flex; flex-direction:column; width: 50px; background:#202020; color:#eee; font-family:Century Gothic; position: relative;">
        </div>
        

        <!-- MAIN PIANOROLL CONTAINER (BENDRAI VISŲ TRACKŲ SKILTIS) ||| OVERFLOW-Y:HIDDEN NELEIDŽIA PIANOROLL-CONTAINER ELEMENTUI SUSIKURT SAVO PATIES SCROLLO, MUM JO NEREIKIA, MUM REIKIA, KAD PIANOROLL EILUČIŲ LABELAI IR PAČIOS EILUTĖS JUDĖTŲ KARTU! -->
        <div id="pianoroll-container" style="width:900px; overflow-x:auto; overflow-y:hidden; position: relative;">
            <!-- <div id="barLineNumbersSection" class="syncedHorizontalScroll" style="width:10000px; height:10px; background:#111; position:relative;">
                <p>123456789</p>
            </div>
            <div id="progressBar" class="syncedHorizontalScroll" style="width:10000px; height:10px; background:#222; position:relative;"></div> -->
            <!-- VISAS PIANOROLL (IR TA DALIS, KURI NESIMATO PIANOROLLO LANGE) -->
            <div id="pianoroll" class="syncedHorizontalScroll" style="width:10000px; background:#111; position:relative;"></div>
            <div id="playhead"></div>
        </div>
    </div>
                                 
                                                                     
    <script src="/static/pianoroll_page.js"></script>                               
    """)




## dar čia tvarkytina |||||||||||||
@ui.page("/page3")
def page3():
    include_static_assets(js_files=[], css_files=[])

    page3_head_html = ui.add_head_html('''
    <style>
   .main-content {
    background-color: #344966; 
    min-height: 100vh;
    padding-top: 120px;                              
    }
                                       
    .header-content {
    background-color: #E6AACE;
    padding: 7px;
    width: 85vw;
    align-items: center;
    margin: auto;
    border-radius: 10px;
    display: flex;
    flex-direction: row;
    flex: 1;
    justify-content: space-between;  
    position: relative;                
    }
                                       
    .navigation-link {
    display: flex;
    flex-direction: row;
    gap: 30px;
    font-size: 20px;
    }
                                       
    h5 {
    margin-left: 110px;
    font-size: 34px;
    }
    
    .text-block {
    font-weight: 500;
    font-size: 80px;
    padding-left: 10px;                        
    }
                                       
    .smalltext-block {
    font-weight: 420;
    font-size: 30px;
    text-align: left;
    margin: 0;
    padding-left: 20px;                                   
    line-height: 1.4;
    letter-spacing: 2px;
    margin-top: 10px;                        
    }
                                       
    .logo {
    position: absolute;
    left: -10px;
    top: -190%;
                                                        
    }

    .left-block {
    background-color: #E6AACE;
    border-radius: 7px;
    display: flex;
    flex-direction: column;
    min-height: 10vh;
    width: 35vw;
    position: relative;
    margin-left: 50px;
    padding-top: 20px;
    padding-bottom: 10px;
    }

    .content-block {
    margin: auto;
    padding: 20px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 70px;                             
    } 

    .mygtukas {
    position: absolute;
    width: 220px;
    height: 80px;
    border-radius: 60px;
    background-color: black;
    right: -10%;
    top: 90%;
    color: white; 
    font-size: 30px;
    font-weight: 600;
    align-items: center;
    justify-content: center;
    display: flex;                                                              
    }                                      
    
    </style>
    ''')

    page3_body_html = ui.add_body_html("""
        <div class="main-content">
  <div class="header-content">
    <div class="navigation-link">
      <img class="logo" src="static/logo.svg" />
      <h5>DumDumDaw</h5>
    </div>
    <div class="navigation-link">
      <a>About</a>
      <a>Guide</a>
      <a>Projects</a>
    </div>
  </div>
  <div class="content-block">
    <div class="left-block"><h1 class="text-block">The Best DAW For Dumdums!</h1> <h5 class="smalltext-block">Make simple MIDI beats, <br> all in an easy-to-use <br> interface.</h5><a href="/" class="mygtukas">Open Builder</a></div>
  
    <div><img class="logo-screen" src="static/screen.png"/></div>
    <div></div>
  </div>
</div>
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
    # print(track_note_data)  # print to console for debugging
    return {'status': 'ok'}

ui.run()