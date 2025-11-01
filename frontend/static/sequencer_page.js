document.addEventListener('DOMContentLoaded', () => {
    
    const sequencerContainer = document.getElementById("sequencer-container");
    const sequencer = document.getElementById('sequencer');
    const labelsDiv = document.getElementById('labels');

    // Clear previous labels/tracks to prevent duplication
    labelsDiv.innerHTML = '';
    sequencer.innerHTML = '';

    const trackCount = 10;         // number of tracks
    const trackHeight = 100;       // per-track height
    const timelineWidthPx = 5000; // timeline width
    const gridSize = 10;        // grid'o plotis (pikseliais) = minimalus natos elemento ilgis = minimalus natos elemento pastūmimo kelias
    let trackNotes = {};          // per-track note data
    let noteCounter = 0;        // pradinis natų skaičius (0)

    //let tracksInstruments = {}; // trackui parinktų instrumentų duomenys


    sequencer.style.height = (trackCount * trackHeight) + 'px';                 // NUSTATOMAS VISO SEQUENCER ELEMENTO AUKŠTIS (priklauso nuo trackų skaičiaus)
    sequencerContainer.style.height = (trackCount * trackHeight) + 15 + 'px';   // BE ŠITO APIBRĖŽIMO, BENDRAI TRACK EILIŲ MATOSI TIK TIEK PIKSELIŲ, KIEK YRA NUSTATYTA VISO SEQUENCER MATOMAM SCROLL LANGE (pvz., 550px), O NE VISI (pvz., 1000px=10*100) 
    labelsDiv.style.height = (trackCount * trackHeight) + 15 + 'px';            // BE ŠITO APIBRĖŽIMO, LABELSDIV ELEMENTO AUKŠTIS KAŽKODĖL PATS SUMAŽĖJA (KIEKVIENAS LABEL BOX UŽIMA 95,8PX, O NE 100PX), TAMPA NELYGUS TRACK EILUČIŲ AUKŠČIUI. Čia aiškiai apibrėžiam, kad labelsDiv (html id="labels") aukštis yra 1000px (100*10)
    

    // APIBRĖŽIAMAS DAW'O INSTRUMENTŲ SĄRAŠAS
    const instrumentList = [
            {value: "", text: "Choose instrument"},
            {value: "piano", text: "Piano"},
            {value: "guitar", text: "Guitar"},
            {value: "drums", text: "Drums"},
            {value: "organ", text: "Organ"},
            {value: "synth", text: "Synth"},
    ];                                  

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
        trackNotes[i] = []; // paruošia vietą i-tojo tracko natoms trackNotes sąraše
        //tracksInstruments[i] = [];
        track.addEventListener('dblclick', e => addNoteToTrack(track, e));

        // LABELAI (kairėje) ATSKIRAI
                                        
        // TRACK LABELO ELEMENTŲ CONTAINER ('DĖŽĖ')                              
        const labelBox = document.createElement('div');
        labelBox.setAttribute("id", "track-" + (i+1) + "-box");
        labelBox.style.height = trackHeight + 'px';
        labelBox.style.background = '#253644';              // label langelio fono spalva
        labelBox.style.display = 'block';                   // kad elementai viens po kitu eitų (track pavadinimas, instrumentų mygtukas turi būt viens po kitu; kiti du mygtukai bus virš instrumentų mygtuko, tai bendram jų div irgi tinka block display, nors ir patys mygtukai bus šone viens kito)
        //labelBox.style.alignItems = 'center';
        //labelBox.style.justifyContent = 'center';
        labelBox.style.borderBottom = '1px solid #333';
        labelBox.style.padding = '10px 10px';
        
        // PATS TRACK LABELAS                              
        const label = document.createElement('div');
        label.setAttribute("id", "track-" + (i+1) + "-label");                 // prie kiekvieno label langelio elemento prideda html ID atributą (tikslas — tokiu būdu būtų galima customizint būtent 'Track 1' label langelį, kad būtų galima jo top-left kampą padaryti apvalų (apvalint TIK bendro visų labelų elemento top-left kampą nepavyksta, nes tuo atveju tą apvalintą kampą tiesiog užstoja "Track 1" label langelis, jo nesimato; dėl to reikia apvalint IR bendro visų labelų elemento top-left kampą, IR "Track 1" label langelio top-left kampą))
        label.textContent = 'Track ' + (i + 1);
        label.style.flex = '1';
        
                                        
        // PARAMETRŲ IR VOLUME MYGTUKŲ KONTEINERIS
        const parametersVolumeButtonsContainer = document.createElement('div');
        parametersVolumeButtonsContainer.style.display = "flex";
        //parametersVolumeButtonsContainer.style.justifyContent = "center";
                                        
        // PARAMETRŲ MYGTUKAS
        const parametersButton = document.createElement('button');
        parametersButton.className = "parametersVolumeButtons";  // klasė, skirta vienodai stilizuot abiem apvaliesiem tracko mygtukam
        parametersButton.id = "parambutton";
        parametersButton.textContent = 'P';
        // PRIDEDAMAS FUNKCIONALUMAS, KAD PASPAUDUS P ATSIDARYS TO TRACKO PIANOROLL PUSLAPIS
        parametersButton.addEventListener('click', async () => {
            const trackId = i + 1;
            const response = await fetch(`/api/get-pianoroll-url?track=${trackId}`);
            const data = await response.json();
            //tracksInstruments[trackId].push({value: selectInstrument.value, name: selectInstrument.options[selectInstrument.selectedIndex].text});
            window.open(data.url, '_blank'); // opens new tab with pianoroll
        });
                                        
        // VOLUME MYGTUKAS (gal jo galų gale ir nereiks, gal bus koks slideris; nebent pavyks popupe sliderį padaryt)
        const volumeButton = document.createElement('button');
        volumeButton.className = "parametersVolumeButtons";
        volumeButton.textContent = "V";
                                        
        // PARAMETRŲ IR VOLUME MYGTUKAI PRIDEDAMI Į JIEM SKIRTĄJĮ KONTEINERĮ
        parametersVolumeButtonsContainer.appendChild(parametersButton);
        parametersVolumeButtonsContainer.appendChild(volumeButton);
        
                                        
        // INSTRUMENTO PASIRINKIMO DROPDOWN SĄRAŠAS
        const selectInstrument = document.createElement('select');
        selectInstrument.name = 'selectInstrument';
        selectInstrument.id = 'selectInstrument';

        // PRIDEDAMAS KIEKVIENAS INSTRUMENTO PASIRINKIMAS Į INSTRUMENTO PASIRINKIMO DROPDOWN SĄRAŠĄ
        instrumentList.forEach(opt => {
        const instrumentOption = document.createElement('option');
        instrumentOption.value = opt.value;
        instrumentOption.textContent = opt.text;
        selectInstrument.appendChild(instrumentOption);
        });
        
        labelBox.appendChild(label)
        labelBox.appendChild(parametersVolumeButtonsContainer);
        labelBox.appendChild(selectInstrument);
        labelsDiv.appendChild(labelBox);
                                        

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
        trackNotes[trackId].push({id: note.id, start: left, duration: width}); // talpina konkrečiame tracke patalpinto elemento duomenis trackNotes sąrašan

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
    /*    
    function sendChosenTrackInstruments() {
        fetch('/tracks_instruments', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(tracksInstruments)
        }).catch(err => console.warn('Backend sync failed:', err));
    }*/

    // NATŲ DUOMENŲ SIUNTIMO BACKENDAN FUNKCIJA (galimai tobulintina)
    function sendAllNotesToBackend() {
        fetch('/update_tracks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(trackNotes)
        }).catch(err => console.warn('Backend sync failed:', err));
    }
});