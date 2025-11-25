document.addEventListener('DOMContentLoaded', () => {

    let noteBlockData = {};
    
    getAllNoteBlocks();
    
    // priskiriam JS kintamuosius esminiams html sequencerio elementams
    const sequencerContainer = document.getElementById("sequencer-container");
    const sequencer = document.getElementById('sequencer');
    const labelsDiv = document.getElementById('labels');

    // Clear previous labels/tracks to prevent duplication
    labelsDiv.innerHTML = '';
    sequencer.innerHTML = '';

    // Natų-blokų duomenų rinkimo kintamieji (KURIANT BACKENDĄ, GALI REIKT ŠIUOS KINTAMUOSIUS PAKEIST) {BACKEND}
    let trackNotes = {};            // per-track note data
    let noteCounter = 0;            // pradinis natų-blokų skaičius (0)


    // ========== INSTRUMENTŲ DALIS ==========

    // APIBRĖŽIAMAS DAW'O INSTRUMENTŲ SĄRAŠAS {BACKEND}
    const instrumentList = [
            {value: "", text: "Choose instrument"},
            {value: "bass-electric", text: "Electric Bass"},
            {value: "bassoon", text: "Bassoon"},
            {value: "cello", text: "Cello"},
            {value: "clarinet", text: "Clarinet"},
            {value: "contrabass", text: "Contrabass"},
            {value: "flute", text: "Flute"},
            {value: "french-horn", text: "French Horn"},
            {value: "guitar-acoustic", text: "Acoustic Guitar"},
            {value: "guitar-electric", text: "Electric Guitar"},
            {value: "guitar-nylon", text: "Nylon Guitar"},
            {value: "harmonium", text: "Harmonium"},
            {value: "harp", text: "Harp"},
            {value: "organ", text: "Organ"},
            {value: "piano", text: "Piano"},
            {value: "saxophone", text: "Saxophone"},
            {value: "trombone", text: "Trombone"},
            {value: "trumpet", text: "Trumpet"},
            {value: "tuba", text: "Tuba"},
            {value: "violin", text: "Violin"},
            {value: "xylophone", text: "Xylophone"},
    ];             
    //let tracksInstruments = {}; // trackui parinktų instrumentų duomenys



    // ========================================= SEQUENCER KOMPONENTŲ DALIS =========================================

    const trackCount = 10;         // number of tracks
    const trackHeight = 100;       // per-track height
    const timelineWidthPx = 10000; // timeline width
    const gridSize = 10;        // grid'o plotis (pikseliais) = minimalus natos elemento ilgis = minimalus natos elemento pastūmimo kelias

    // Sequencerio html elementų aukščiai
    sequencer.style.height = (trackCount * trackHeight) + 'px';                 // NUSTATOMAS VISO SEQUENCER ELEMENTO AUKŠTIS (priklauso nuo trackų skaičiaus)
    sequencerContainer.style.height = (trackCount * trackHeight) + 15 + 'px';   // BE ŠITO APIBRĖŽIMO, BENDRAI TRACK EILIŲ MATOSI TIK TIEK PIKSELIŲ, KIEK YRA NUSTATYTA VISO SEQUENCER MATOMAM SCROLL LANGE (pvz., 550px), O NE VISI (pvz., 1000px=10*100) 
    labelsDiv.style.height = (trackCount * trackHeight) + 15 + 'px';            // BE ŠITO APIBRĖŽIMO, LABELSDIV ELEMENTO AUKŠTIS KAŽKODĖL PATS SUMAŽĖJA (KIEKVIENAS LABEL BOX UŽIMA 95,8PX, O NE 100PX), TAMPA NELYGUS TRACK EILUČIŲ AUKŠČIUI. Čia aiškiai apibrėžiam, kad labelsDiv (html id="labels") aukštis yra 1000px (100*10)
                                

    // ========== TRACKŲ SUKŪRIMO DALIS (didelis for loopas) ==========

    for (let i = 0; i < trackCount; i++) {
        
        // Trackai
        const track = document.createElement('div');
        track.className = 'track';
        track.dataset.trackId = String(i+1);
        track.style.position = 'absolute';
        track.style.left = '0px';
        track.style.top = (i * trackHeight) + 'px';
        track.style.width = timelineWidthPx + 'px';
        track.style.height = trackHeight + 'px';
        track.style.background = (i % 2 === 0) ? '#0d1821' : '#142532';     // tracko fono spalva (dvi spalvos, nes kas antras trackas yra tamsesnis, kas antras yra šviesesnis)
        track.style.borderBottom = '1px solid #333';
        sequencer.appendChild(track);
        
        track.addEventListener("dblclick", e => {
            const trackId = track.dataset.trackId;
            openPianorollForTrack(trackId);
            
        });
        // Trackų numeracija trackNotes Objecte {'i' : [...]} {BACKEND}
        trackNotes[i] = [];         // paruošia vietą i-tojo tracko natoms trackNotes sąraše

        // Labelai 
                                        
        // Labelo elementų "konteineris" (div elementas)                             
        const labelBox = document.createElement('div');
        labelBox.setAttribute("id", "track-" + (i+1) + "-box");
        labelBox.style.height = trackHeight + 'px';
        labelBox.style.background = '#253644';
        labelBox.style.borderBottom = '1px solid #333';
        labelBox.style.padding = '10px 10px';
        
        // Labelo pats tekstas (pvz., Track 1)                              
        const label = document.createElement('div');
        label.setAttribute("id", "track-" + (i+1) + "-label");                 // prie kiekvieno label langelio elemento prideda html ID atributą (tikslas — tokiu būdu būtų galima customizint būtent 'Track 1' label langelį, kad būtų galima jo top-left kampą padaryti apvalų (apvalint TIK bendro visų labelų elemento top-left kampą nepavyksta, nes tuo atveju tą apvalintą kampą tiesiog užstoja "Track 1" label langelis, jo nesimato; dėl to reikia apvalint IR bendro visų labelų elemento top-left kampą, IR "Track 1" label langelio top-left kampą))
        label.textContent = 'Track ' + (i + 1);
        label.style.flex = '1';
                                      
        // (P)ianoroll ir (V)olume mygtukų konteineris
        const parametersVolumeButtonsContainer = document.createElement('div');
        parametersVolumeButtonsContainer.style.display = "flex";
                                        
        // Pianoroll mygtukas
        const parametersButton = document.createElement('button');
        parametersButton.className = "parametersVolumeButtons";
        parametersButton.id = "parambutton";
        parametersButton.textContent = 'P';

        // Funkcija, kad paspaudus (P)ianorollo mygtuką atsidarys to tracko pianoroll puslapis {BACKEND}
        parametersButton.addEventListener('click', async () => {
            const trackId = i + 1;
            const response = await fetch(`/api/get-pianoroll-url?track=${trackId}`);
            const data = await response.json();
            window.open(data.url, '_blank');        // opens new tab with pianoroll
        });
                                        
        // Volume mygtukas (dar nieko nedarantis)
        const volumeButton = document.createElement('button');
        volumeButton.className = "parametersVolumeButtons";
        volumeButton.textContent = "V";
                                        
        // (P)ianoroll ir (V)olume mygtukai pridedami į jiem skirtą parent konteinerį
        parametersVolumeButtonsContainer.appendChild(parametersButton);
        parametersVolumeButtonsContainer.appendChild(volumeButton);
          
        // ===== Instrumento pasirinkimo dropdown sąrašas =====

        // Pats sąrašas (html select tipo elementas)
        const selectInstrument = document.createElement('select');
        selectInstrument.className = "selectInstrument";
        selectInstrument.name = 'selectInstrument' + (i+1);
        selectInstrument.id = 'selectInstrument' + (i+1);

        // Pridedamas kiekvienas instrumento pasirinkimas į instrumentų pasirinkimo sąrašą {BACKEND}
        instrumentList.forEach(opt => {
        const instrumentOption = document.createElement('option');
        instrumentOption.value = opt.value;
        instrumentOption.textContent = opt.text;
        selectInstrument.appendChild(instrumentOption);
        });


        // Į bendrą parent label box konteinerį sudedami visi jo elementai, ir pats label box į visų labelų bendrą konteinerį
        labelBox.appendChild(label)
        labelBox.appendChild(parametersVolumeButtonsContainer);
        labelBox.appendChild(selectInstrument);
        labelsDiv.appendChild(labelBox);
                                        
    }


    // ============================== SEQUENCERIO ESMINIŲ FUNKCIONALUMŲ DALIS (natų-blokų dėjimas/trynimas, stumdymas, tampymas) ==============================
    // NOTE: Galų gale blokų įdėjimo pele ir blokų tampymo funkcijos turės būti pašalintos!


    // ========== SUKURTŲ NATŲ BLOKŲ SUDĖLIOJIMAS SEQUENCERY ==========




    // ========== NATŲ PRIDĖJIMO (ir trynimo) Į SEQUENCERĮ FUNKCIONALUMAS ========== (Galų gale bus pašalintas pridėjimas pele, turės atsirasti automatiškai, priklausomai nuo pianorollo signalų!)
    
    
    function openPianorollForTrack(trackId) {

        let chosenInstrument = document.getElementById("selectInstrument" + trackId).value;
        
        if (!chosenInstrument) {
            let selectOfInstrumentlessTrack = document.getElementById(`selectInstrument${trackId}`);
            backgroundOfSelect = selectOfInstrumentlessTrack.style.background;
            selectOfInstrumentlessTrack.style.background = "#ff0000";
            setTimeout(function(){ selectOfInstrumentlessTrack.style.background = backgroundOfSelect }, 250);
            return;
        };
        
        fetch(`/api/get-pianoroll-url?track=${trackId}&instrument=${trackId}`)
            .then(res => res.json())
            .then(data => {
                const finalUrl = new URL (data.url, window.location.origin);
                finalUrl.searchParams.set("instrument", chosenInstrument);
                window.open(finalUrl.href, "_self");
            })
            .catch(err => console.error("Failed to open pianoroll:", err));
        
    }




    // ========== NATŲ-BLOKŲ STUMDYMO PELE FUNKCIJA ==========

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

                // Sequencer sąraše suranda pastumdyto bloko ID {BACKEND}
                const n = trackNotes[trackId].find(n => n.id === note.id);

                // Pakeičia pastumdyto bloko start duomenis {BACKEND}
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

    // ========== BLOKŲ ILGIO KAITYMO (BLOKŲ TAMPYMO) PELE FUNKCIJA ========== (Ji galų gale turės būti pašalinta!!)

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

                // Sequencerio blokų sąraše suranda patampyto bloko ID {BACKEND}
                const n = trackNotes[trackId].find(n => n.id === note.id);

                // Pakeičia patampyto bloko duration duomenis {BACKEND}
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


    // ============================== PLAYBACK LINIJOS VIZUALUS FUNKCIONALUMAS (play, pause, stop) ==============================
    // Playback mygtukai turėtų turėt dvi paskirtis: 1. vizualią (linijos judėjimo kaitymas);  2. grojimo (įrašo grojimas/nebegrojimas) {BACKEND}

    let playhead = document.getElementById("playhead");
    let isPlaying = false;
    let startTimestamp = null;                              // laiko momentas, kai buvo pradėtas grojimas
    let pauseOffset = 0;                                    // how far into the track we've played (ms)
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
        const currentTime = performance.now();  // paimamas laikas, praėjęs nuo apskritai pradžios (nuo puslapio pakrovimo pradžios?)
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

    sequencerContainer.addEventListener("scroll", () => {
        const offset = sequencerContainer.scrollLeft;
        playhead.style.left = `${-offset}px`;
    });

    // ========== PLAY, PAUSE, STOP MYGTUKŲ FUNKCIONALUMAS ==========

    const playButton = document.getElementById("playButton");
    const pauseButton = document.getElementById("pauseButton");
    const returnButton = document.getElementById("returnButton");

    if (playButton) playButton.addEventListener('click', playPlayback);
    if (pauseButton) pauseButton.addEventListener('click', pausePlayback);
    if (returnButton) returnButton.addEventListener('click', stopPlayback);

    
    // ============================== RYŠIO SU BACKENDU FUNKCIJOS ==============================
    
    // ========== JAU SUKURTŲ NATŲ BLOKŲ DUOMENŲ PASIĖMIMO FUNKCIJA ==========

    function getAllNoteBlocks() {

        fetch("http://localhost:6767/get_all_blocks")
            .then(response => {
                console.log(response);
                // čia returnina reikiamus duomenis (blokų, ne responso!)
                return response.json();
            })
            .then(blocks => {
                noteBlockData = blocks;
                placeBlocksInSequencer(noteBlockData);
                console.log(noteBlockData);
            })
            .catch(err => console.warn('Backend sync failed:', err));

    }

    function placeBlocksInSequencer(noteBlockData) {

        let pureNoteBlockData = Object.values(noteBlockData);
        console.log(pureNoteBlockData);

        // gausim natų blokų pradžios ir pabaigos laikus
        const ranges = getNoteBlockTimeRanges(pureNoteBlockData);
        console.log(ranges);

        // dar reikia: 
        // 1. kiekvienam blokui sukurt objektą, su vertėm (ne tik?): id, start, end
        // 2. blokus priskirt atitinkamiem trackam
        // 3. trackam priskirt instrumentus (kad tai rodytų selecte)

    }

    function getNoteBlockTimeRanges(pureNoteBlockData) {

        return pureNoteBlockData.map(block => {
            // get all start and end times
            const starts = block.map(note => note[2]);
            const ends   = block.map(note => note[3]);

            // compute min / max
            const blockStart = Math.min(...starts);
            const blockEnd   = Math.max(...ends);

            return { start: blockStart, end: blockEnd };
        });

    }


    // ============================== NATŲ-BLOKŲ DUOMENŲ SIUNTIMO BACKENDAN FUNKCIJA ==============================

    function sendAllNotesToBackend() {

        fetch('/update_tracks', {

            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(trackNotes)

        }).catch(err => console.warn('Backend sync failed:', err));

    }
    
});