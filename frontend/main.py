from nicegui import ui, app
from fastapi import Request



# set'as (duomenų rinkinys), skirtas rinkti dedamų natų duomenims (aktualu backendui):
track_note_data = {}

@ui.page('/')
def sequencer_page():


    # čia html <head> elemento papildomas kodas. Kol kas čia tik įvairių html elementų stiliai (prie kiekvieno nurodyta kieno tiksliai).
    sequencerPuslapioHeadHtml = ui.add_head_html('''
    <style>

        /*VISO HTML <BODY> ELEMENTO STILIAI*/             
        body {
            background-color: #344966;
            font-family: "Century Gothic";
        }
        
        
                     
        /*NATOS BLOKELIO STILIAI*/
        .note {
            position: absolute;
            height: 60px;
            background: #2ecc71;
            border: 1px solid #27ae60;
            cursor: move;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            border-radius: 4px;
            box-sizing: border-box;
        }
                        
        /*NATOS BLOKELIO "RANKENOS" (kairėje) STILIAI*/
        .note-handle {
            width: 8px;
            height: 100%;
            background: #27ae60;
            cursor: ew-resize;
            border-left: 1px solid rgba(0,0,0,0.15);
        }

        /*TRACK 1 LABEL LANGELIO STILIAI (apvalina jo top-left kampą)*/
        #track-1-label {
            border-radius: 10px 0px 0px 0px;
        }

        /*SCROLLBARO RUOŽO STILIAI*/        
        ::-webkit-scrollbar {
            background: #202020;
            border-radius: 0px 0px 10px 0px;
        }

        /*SCROLLBARO "RANKENOS" STILIAI*/        
        ::-webkit-scrollbar-thumb {
            background: #e6aace;
            border-radius: 10px;
            border: 3px solid #202020;
            
        }

        /*SCROLLBARO "RANKENOS" STILIAI, KAI ANT JOS LAIKOMAS CURSORIUS*/       
        ::-webkit-scrollbar-thumb:hover {
            background: #ffffff; 
        }

    </style>

    ''')

    

    
    # čia papildomas html <body> elemento kodas. Konkrečiai čia yra viskas, kas apima patį sequencerį (ta trackų "dėžė"). Kol kas, šio html kodo sudėtis tokia:
    # 1. html kodas, sukuriantis viso sequencerio elementą, taip pat ir atskirus jo elementus:
    #       1. trackų labelių bendras elementas (id = "labels"; trackų labeliai — kairėje nuo pačių trackų);  
    #       2. trackų bendras elementas (id = "sequencer-container").
    # 2. <script> elemente esantis JavaScript kodas. Jis (kol kas) apima šiuos dalykus:
    #       1. Sukuria atskirus trackus ir jų labelius;
    #       2. Sukuria natų pridėjimo (spustelėjus pele) funkciją  (toje pačioje JS "addNoteToTrack" funkcijoje yra ir natų šalinimo funkcija (su right-click));
    #       3. Sukuria natų stumdymo track'e funkciją;
    #       4. Sukuria natų ilginimo (tampymo) funkciją (nors tamposi tik iš dešinės pusės, bet, manau, to pakanka);
    #       5. Sukuria esamų natų duomenų perdavimo backend'ui funkciją (nors galimai dar ji tobulintina, pvz., keičiant natos vietą/ilgį, duomenys imami žiauriai dažnai, kas gal nlb gerai)
    sequencerKodas = ui.add_body_html("""

    <!-- flex-direction:row padaro, kad labelų ir sequencerio dalys rikiuotųsi eilute, ne stulpeliu (ne vertikaliai viens po kitu); justify-content:center padaro, kad visa labelų ir sequencerio visuma būtų horizontaliai vidury, o ne kairėj ar dar kur -->
    <div style="display:flex; flex-direction:row; justify-content:center; margin-top: 50px;">
        <!-- LEFT LABELS (BENDRAI VISI LABELAI) -->
        <div id="labels" style="display:flex; flex-direction:column; background:#202020; color:#eee; font-family:Century Gothic; border-radius:10px 0px 0px 10px;">
        </div>

        <!-- MAIN SEQUENCER CONTAINER (BENDRAI VISŲ TRACKŲ SKILTIS) -->
        <div id="sequencer-container" style="width:900px; overflow-x:auto; border-radius:0px 10px 10px 0px;">
            <!-- VISAS SEQUENCERIS (IR TA DALIS, KURI NESIMATO SEQUENCERIO LANGE) -->
            <div id="sequencer" style="width:2500px; background:#111; position:relative;"></div>
        </div>
    </div>

    <script>
    const sequencer = document.getElementById('sequencer');
    const labelsDiv = document.getElementById('labels');
    const trackCount = 4;         // number of tracks
    const trackHeight = 80;       // per-track height
    const timelineWidthPx = 2500; // timeline width
    const gridSize = 10;
    let trackNotes = {};          // per-track note data
    let noteCounter = 0;

    // NUSTATOMAS VISO SEQUENCER ELEMENTO AUKŠTIS (priklauso nuo trackų skaičiaus)
    sequencer.style.height = (trackCount * trackHeight) + 'px';

    // CREATE TRACKS AND LABELS (LABEL - KVADRAČIUKAS KAIRĖJE PRIE PATIES TRACKO, TEN KUR PVZ. "TRACK 1")
    for (let i = 0; i < trackCount; i++) {
        // TRACKAI ATSKIRAI
        const track = document.createElement('div');
        track.className = 'track';
        track.dataset.trackId = String(i);
        track.style.position = 'absolute';
        track.style.left = '0px';
        track.style.top = (i * trackHeight) + 'px';
        track.style.width = timelineWidthPx + 'px';
        track.style.height = trackHeight + 'px';
        track.style.background = (i % 2 === 0) ? '#0d1821' : '#142532';     // tracko fono spalva (dvi spalvos, nes kas antras trackas yra tamsesnis, kas antras yra šviesesnis)
        track.style.borderBottom = '1px solid #333';
        sequencer.appendChild(track);
        trackNotes[i] = [];
        track.addEventListener('dblclick', e => addNoteToTrack(track, e));

        // LABELAI (kairėje) ATSKIRAI
        const label = document.createElement('div');
        label.setAttribute("id", "track-" + (i+1) + "-label")                 // prie kiekvieno label langelio elemento prideda html ID atributą (tikslas — tokiu būdu būtų galima customizint būtent 'Track 1' label langelį, kad būtų galima jo top-left kampą padaryti apvalų (apvalint TIK bendro visų labelų elemento top-left kampą nepavyksta, nes tuo atveju tą apvalintą kampą tiesiog užstoja "Track 1" label langelis, jo nesimato; dėl to reikia apvalint IR bendro visų labelų elemento top-left kampą, IR "Track 1" label langelio top-left kampą))
        label.textContent = 'Track ' + (i + 1);
        label.style.height = trackHeight + 'px';
        label.style.background = '#253644';             // label langelio fono spalva
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.justifyContent = 'center';
        label.style.borderBottom = '1px solid #333';
        label.style.padding = '0 10px';
        labelsDiv.appendChild(label);
    }

    // NATŲ PRIDĖJIMO TRACKAN FUNKCIJA
    function addNoteToTrack(track, e) {
        const rect = sequencer.getBoundingClientRect();
        let left = e.clientX - rect.left;
        left = Math.max(0, Math.min(left, timelineWidthPx));
        left = Math.round(left / gridSize) * gridSize;
        const width = 50;

        const note = document.createElement('div');
        note.className = 'note';
        note.id = 'note-' + noteCounter;
        note.style.left = left + 'px';
        note.style.width = width + 'px';
        const trackId = track.dataset.trackId;
        note.style.top = (parseInt(trackId) * trackHeight + 10) + 'px';

        const handle = document.createElement('div');
        handle.className = 'note-handle';
        note.appendChild(handle);

        // ADD RIGHT-CLICK DELETE
        note.addEventListener('contextmenu', e => {
            e.preventDefault();
            note.remove();
            trackNotes[trackId] = trackNotes[trackId].filter(n => n.id !== note.id);
            sendAllNotesToBackend();
        });

        sequencer.appendChild(note);
        trackNotes[trackId].push({id: note.id, start: left, duration: width});

        makeDraggable(note, trackId);
        makeResizable(note, handle, trackId);

        noteCounter++;
        sendAllNotesToBackend();
    }

    // NATŲ STUMDYMO PELE FUNKCIJA
    function makeDraggable(note, trackId) {
        let offsetX;
        note.addEventListener('mousedown', (e) => {
            if (e.target.className === 'note-handle') return;
            offsetX = e.clientX - note.getBoundingClientRect().left;
            function mouseMoveHandler(e) {
                const rect = sequencer.getBoundingClientRect();
                let newLeft = e.clientX - rect.left - offsetX;
                newLeft = Math.max(0, Math.min(newLeft, timelineWidthPx - note.offsetWidth));
                newLeft = Math.round(newLeft / gridSize) * gridSize;
                note.style.left = newLeft + 'px';
                const n = trackNotes[trackId].find(n => n.id === note.id);
                if (n) n.start = newLeft;
                sendAllNotesToBackend();
            }
            function mouseUpHandler() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    // NATŲ ILGIO KAITYMO (NATŲ TAMPYMO) PELE FUNKCIJA
    function makeResizable(note, handle, trackId) {
        let startX, startWidth;
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startX = e.clientX;
            startWidth = note.offsetWidth;
            function mouseMoveHandler(e) {
                const delta = e.clientX - startX;
                let newWidth = Math.max(10, startWidth + delta);
                newWidth = Math.round(newWidth / gridSize) * gridSize;
                note.style.width = newWidth + 'px';
                const n = trackNotes[trackId].find(n => n.id === note.id);
                if (n) n.duration = newWidth;
                sendAllNotesToBackend();
            }
            function mouseUpHandler() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    // NATŲ DUOMENŲ SIUNTIMO BACKENDAN FUNKCIJA (galimai tobulintina)
    function sendAllNotesToBackend() {
        fetch('/update_tracks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(trackNotes)
        }).catch(err => console.warn('Backend sync failed:', err));
    }
    </script>

                                    
    """)

# funkcija rinkti duomenis backend'ui:
@app.post('/update_tracks')
async def update_tracks(request: Request):
    global track_note_data
    track_note_data = await request.json()
    print(track_note_data)  # print to console for debugging
    return {'status': 'ok'}

ui.run()