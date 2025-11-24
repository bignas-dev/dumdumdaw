document.addEventListener('DOMContentLoaded', () => {
    
    // iš pianoroll puslapio linko (kuris paduotas iš sequencer_page), ištraukiam track ir instrument query paramus (kitaip tariant, taip pasiimam track ID ir track instrument vertes iš sequencer puslapio)
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("track");
    const instrument = params.get("instrument");

    // priskiriam JS kintamuosius esminiams html pianorollo elementams
    const pianorollContainer = document.getElementById("pianoroll-container");
    const pianoroll = document.getElementById('pianoroll');
    const pitchLabelsBox = document.getElementById('pitchLabels');

    // Clear previous labels/tracks to prevent duplication
    pitchLabelsBox.innerHTML = '';
    pianoroll.innerHTML = '';

    // Natų duomenų rinkimo kintamieji (KURIANT BACKENDĄ, GALI REIKT ŠIUOS KINTAMUOSIUS PAKEIST) {BACKEND}
    let pianorollNotes = {};          // per-pitchRow note data
    let noteCounter = 0;

    let singleNoteRegister = {};
    const noteNamesOfRows = {};

    document.getElementById("instrumentName").innerHTML = instrument.toUpperCase();


    // ========================================= PIANOROLL KOMPONENTŲ DALIS =========================================


    // Tonų (natų tonų) ir jų eilučių (vad. Pitch Row) pianorolle parametrai
    const pitchRowCount = 96;               // number of tracks
    const pitchRowHeight = 20;              // per-pitchRow height
    const timelineWidthPx = 10000;           // timeline width
    const gridSize = 10;

    // Pianoroll html elementų aukščiai
    pianoroll.style.height = (pitchRowCount * pitchRowHeight) + 'px';                       // NUSTATOMAS VISO PIANOROLL ELEMENTO AUKŠTIS (priklauso nuo trackų skaičiaus)
    pianorollContainer.style.height = (pitchRowCount * pitchRowHeight) + 15 + "px";         // BE ŠITO APIBRĖŽIMO, BENDRAI PIANOROLL EILIŲ MATOSI TIK TIEK AUKŠČIO, KIEK YRA JO NUSTATYTA VISO PIANOROLL MATOMAM SCROLL LANGE (pvz., 550px), O NE VISAS (pvz., 1920px=96*20) 
    pitchLabelsBox.style.height = (pitchRowCount * pitchRowHeight) + 15 + "px";             // BE ŠITO APIBRĖŽIMO, LABELSDIV ELEMENTO AUKŠTIS KAŽKODĖL PATS SUMAŽĖJA (KIEKVIENAS LABEL BOX UŽIMA 95,8PX, O NE 100PX), TAMPA NELYGUS TRACK EILUČIŲ AUKŠČIUI. Čia aiškiai apibrėžiam, kad pitchLabelsBox (html id="labels") aukštis yra 1000px (100*10)          


    // ========== NATŲ EILIŲ (pitch row) SUKŪRIMO DALIS (didelis for loopas) ==========

    for (let i = 0; i < pitchRowCount; i++) {

        // Natų eilės
        const pitchRow = document.createElement('div');
        pitchRow.className = 'pitchRow';
        pitchRow.dataset.rowId = String(i);
        pitchRow.style.position = 'absolute';
        pitchRow.style.left = '0px';
        pitchRow.style.top = (i * pitchRowHeight) + 'px';
        pitchRow.style.width = timelineWidthPx + 'px';
        pitchRow.style.height = pitchRowHeight + 'px';
        pitchRow.style.background = (i % 2 === 0) ? '#0d1821' : '#142532';     // tracko fono spalva (dvi spalvos, nes kas antras trackas yra tamsesnis, kas antras yra šviesesnis)
        pitchRow.style.borderBottom = '1px solid #333';
        pianoroll.appendChild(pitchRow);
        // Double clicko event listener (po double click iškviečiama addNoteToTrack funkcija — sukuriama nata)
        pitchRow.addEventListener('dblclick', e => addNoteToTrack(pitchRow, e));
        // Natų eilių numeracija pianorollNotes Objecte {'i' : [...]}
        //pianorollNotes[i] = [];

        // Natų eilių labelai
        const pitchRowLabel = document.createElement('div');
        pitchRowLabel.className = "pitchRowLabel";
        pitchRowLabel.setAttribute("id", "pitchRow-" + (i+1) + "-label");
        pitchRowLabel.style.height = pitchRowHeight + "px";
        pitchRowLabel.style.background = "white";
        pitchRowLabel.style.color = "black";
        pitchRowLabel.style.display = "flex";
        pitchRowLabel.style.justifyContent = "center";
        pitchRowLabel.style.borderBottom = "1px solid #333";

        // Natų eilių labelų sužymėjimas (natos raidė, (#) ir oktavos skaičius)
        switch ((i + 1) % 12) {
            case 1:
                pitchRowLabel.textContent = "B";
                break;
            case 2:
            case 3:
                pitchRowLabel.textContent = "A";
                break;
            case 4:
            case 5:
                pitchRowLabel.textContent = "G";
                break;
            case 6:
            case 7:
                pitchRowLabel.textContent = "F";
                break;
            case 8:
                pitchRowLabel.textContent = "E";
                break;
            case 9:
            case 10:
                pitchRowLabel.textContent = "D";
                break;
            case 11:
            case 0:
                pitchRowLabel.textContent = "C";
                break;
        }                              
        switch ((i + 1) % 12) {
            case 2:
            case 4:
            case 6:
            case 9:
            case 11:
                pitchRowLabel.textContent += "#";
                pitchRowLabel.style.background = "black";
                pitchRowLabel.style.color = "white";
        }
        // (Sužymimi oktavos skaičiai)
        switch (Math.floor(i / 12)) {
            case 0:
                pitchRowLabel.textContent += "8";
                break;
            case 1:
                pitchRowLabel.textContent += "7";
                break;
            case 2:
                pitchRowLabel.textContent += "6";
                break;
            case 3:
                pitchRowLabel.textContent += "5";
                break;
            case 4:
                pitchRowLabel.textContent += "4";
                break;
            case 5:
                pitchRowLabel.textContent += "3";
                break;
            case 6:
                pitchRowLabel.textContent += "2";
                break;
            case 7:
                pitchRowLabel.textContent += "1";
                break;
        }
        pianorollNotes[i] = [];
        noteNamesOfRows[i] = [pitchRowLabel.textContent];       // susirenkam eilių ID ir jų notacijos pavadinimų objectą
        pitchLabelsBox.appendChild(pitchRowLabel);                  

    }

    // ========== TAKTO LINIJŲ SUKŪRIMAS ==========

    barLineGapLengthPx = 40;

    for (let i = 1; i < Math.floor(timelineWidthPx/barLineGapLengthPx); i++) {

        let barLine = document.createElement("div");
        barLine.className = "barLine";
        barLine.style.left = (i*barLineGapLengthPx) + "px";
        
        if (i % 4 == 0) {
            barLine.style.background = "#777777";
        }
        else {
            barLine.style.background = "#333333";
        }

        pianorollContainer.appendChild(barLine);

    }



    // ============================== PIANOROLL ESMINIŲ FUNKCIONALUMŲ DALIS (natų dėjimas/trynimas, stumdymas, tampymas) ==============================


    // ========== BENDRAS PIANOROLL, PROGRESSBAR IR BARLINENUMBER SCROLLAS ==========
    /*
    const pr = document.getElementById("pianoroll-container");
    const bar = document.getElementById("barLineNumSection");
    const pb = document.getElementById("progressBarSection");

    pr.addEventListener("scroll", () => {
        bar.scrollLeft = pr.scrollLeft;
        pb.scrollLeft = pr.scrollLeft;
    });*/

    /*
    const elements = document.querySelectorAll('.syncedHorizontalScroll');

    elements.forEach(el => {
        el.addEventListener('scroll', function() {
            // When one element scrolls horizontally, update all others
            elements.forEach(otherEl => {
                if (otherEl !== this) {
                    otherEl.scrollLeft = this.scrollLeft;
                }
            });
        });
    });*/


    // ========== NATŲ PRIDĖJIMO (ir trynimo) Į PIANOROLLĄ FUNKCIONALUMAS ==========

    function addNoteToTrack(pitchRow, e) {

        const rect = pianoroll.getBoundingClientRect();
        let left = e.clientX - rect.left;
        left = Math.max(0, Math.min(left, timelineWidthPx));
        left = Math.round(left / gridSize) * gridSize;
        const width = 50;

        const note = document.createElement('div');
        note.className = 'note';
        note.id = 'note-' + noteCounter;
        note.style.left = left + 'px';
        note.style.width = width + 'px';
        const rowId = pitchRow.dataset.rowId;       // {BACKEND}
        note.style.top = (parseInt(rowId) * pitchRowHeight + 2) + 'px';

        const handle = document.createElement('div');
        handle.className = 'note-handle';
        note.appendChild(handle);

        // (Trynimo (right clicku) funkcija)
        note.addEventListener('contextmenu', e => {
            e.preventDefault();
            note.remove();
            // Po right-click ištrina tą natą iš pianoroll natų objecto (sąrašo) {BACKEND}
            pianorollNotes[rowId] = pianorollNotes[rowId].filter(n => n.id !== note.id);
            //sendAllNotesToBackend();
        });

        // Prideda natos html elementą į pianoroll elementą (nata - pianorollo child)
        pianoroll.appendChild(note);
        
        // Į PIANOROLL NATŲ OBJECTĄ (sąrašą) PRIDEDA NAUJOS NATOS DUOMENIS: ID, PRADŽIOS POZICIJA, TRUKMĖ {BACKEND} !!!!!!!!
        pianorollNotes[rowId].push({id: note.id, start: left, duration: width});

        makeDraggable(note, rowId);
        makeResizable(note, handle, rowId);

        // Incrementina natų counterį. Nors šitos funkcijos galų gale gal ir nereiks? {BACKEND}
        noteCounter++;
        
        //sendAllNotesToBackend();

        singleNoteRegister = {"instrument" : instrument, "note": String(noteNamesOfRows[rowId])};
        sendSingleNote();

        
    }


    // ========== NATŲ STUMDYMO PELE FUNKCIJA ==========

    function makeDraggable(note, rowId) {
        let offsetX;
        note.addEventListener('mousedown', (e) => {
            if (e.target.className === 'note-handle') return;
            offsetX = e.clientX - note.getBoundingClientRect().left;
            function mouseMoveHandler(e) {

                const rect = pianoroll.getBoundingClientRect();
                let newLeft = e.clientX - rect.left - offsetX;
                newLeft = Math.max(0, Math.min(newLeft, timelineWidthPx - note.offsetWidth));
                newLeft = Math.round(newLeft / gridSize) * gridSize;
                note.style.left = newLeft + 'px';

                // Pianoroll sąraše suranda pastumdytos natos ID {BACKEND}
                const n = pianorollNotes[rowId].find(n => n.id === note.id);

                // Pakeičia pastumdytos natos start duomenis {BACKEND}
                if (n) n.start = newLeft;
                
                //sendAllNotesToBackend();

            }
            
            function mouseUpHandler() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    // ========== NATŲ ILGIO KAITYMO (NATŲ TAMPYMO) PELE FUNKCIJA ==========

    function makeResizable(note, handle, rowId) {

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

                // Pianoroll sąraše suranda patampytos natos ID {BACKEND}
                const n = pianorollNotes[rowId].find(n => n.id === note.id);

                // Pakeičia patampytos natos duration duomenis {BACKEND}
                if (n) n.duration = newWidth;
                
                //sendAllNotesToBackend();

            }
            
            function mouseUpHandler() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }


    // ============================== PLAYBACK LINIJOS VIZUALUS FUNKCIONALUMAS (play, pause, stop) ==============================
    // Playback mygtukai turėtų turėt dvi paskirtis: 1. vizualią (linijos judėjimo kaitymas);  2. grojimo (įrašo grojimas/nebegrojimas) {BACKEND}

    let playhead = document.getElementById("playhead");
    let isPlaying = false;
    let startTimestamp = null;                              // laiko momentas, kai buvo pradėtas grojimas
    let pauseOffset = 0;                                    // how far into the pitchRow we've played (ms)
    let pixelsPerMs = 0.1;                                  // Playback linijos judėjimo greitis (px/ms)
    const totalDuration = timelineWidthPx / pixelsPerMs;    // Pilnas playback grojimo ilgis (priklauso nuo pianoroll ilgio ir judėjimo greičio). KOL KAS kintamasis yra CONST, bet jeigu padarytumėm automatinį pianorollo prasiplėtimą (kai natos artėja prie galo), tada bus LET.

    // ========== LINIJOS JUDĖJIMO FUNKCIJA ==========

    function updatePlayhead(timestamp) {
        
        if (!isPlaying) return;

        if (!startTimestamp) {
            startTimestamp = timestamp;
        }

        const elapsed = timestamp - startTimestamp + pauseOffset;  
        const x = elapsed * pixelsPerMs;

        playhead.style.transform = `translateX(${x}px)`;

        if (elapsed < totalDuration) {
            requestAnimationFrame(updatePlayhead);
        } else {
            stopPlayback(); // jeigu pasiekė totalDuration pabaigą
        }
    }

    // ========== LINIJOS PALEIDIMO JUDĖTI FUNKCIJA (PLAY) ==========

    function playPlayback() {
        
        if (isPlaying) return;
        isPlaying = true;
        startTimestamp = null;  // reset internal timer, but NOT pauseOffset

        requestAnimationFrame(updatePlayhead);
    }

    // ========== LINIJOS SUSTABDYMO FUNKCIJA (PAUSE) ==========

    function pausePlayback() {
        
        if (!isPlaying) return; // jeigu negroja, tai šios funkcijos ir nevykdyt
        isPlaying = false;
        const currentTime = performance.now(); // paimamas laikas, praėjęs nuo apskritai pradžios (nuo puslapio pakrovimo pradžios?)
        // čia kad nevykdytų skaičiavimų ant null
        if (startTimestamp !== null) {
            pauseOffset += currentTime - startTimestamp;
        }
    }

    // ========== LINIJOS SUSTABDYMO IR GRĄŽINIMO ATGAL FUNKCIJA (STOP) ==========

    function stopPlayback() {

        isPlaying = false;
        pauseOffset = 0;
        startTimestamp = null;
        playhead.style.transform = `translateX(0px)`;
        
    }

    // ========== LINIJOS JUDĖJIMO SCROLLINANT (horizontaliai) SUTVARKYMAS ==========

    pianorollContainer.addEventListener("scroll", () => {
        const offset = pianorollContainer.scrollLeft;
        playhead.style.left = `${-offset}px`;
    });

    // ========== PLAY, PAUSE, STOP MYGTUKŲ FUNKCIONALUMAS ==========

    const playButton = document.getElementById("playButton");
    const pauseButton = document.getElementById("pauseButton");
    const returnButton = document.getElementById("returnButton");

    if (playButton) playButton.addEventListener('click', playPlayback);
    if (pauseButton) pauseButton.addEventListener('click', pausePlayback);
    if (returnButton) returnButton.addEventListener('click', stopPlayback);



    // ============================== NATŲ DUOMENŲ SIUNTIMO BACKENDAN FUNKCIJA ==============================
    // Šita funkcija pasikeis, nes: 1. jinai siunčia duomenis ne ten;  2. jinai siunčia dabartiniam backendui netinkamo formato duomenis (reiks pianorollNotes formatą pakeist) {BACKEND}


    /*
    function sendAllNotesToBackend() {

        fetch('/update_tracks', {

            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(pianorollNotes)

        }).catch(err => console.warn('Backend sync failed:', err));
        
    }*/
    
    function sendSingleNote() {

        console.log(JSON.stringify(singleNoteRegister));

        fetch("http://localhost:6767/get_note", {
            method: 'POST',
            headers: {'Content-Type' : 'application/json'},
            body: JSON.stringify(singleNoteRegister)
        }).catch(err => console.warn('Backend sync failed:', err));

    }

});