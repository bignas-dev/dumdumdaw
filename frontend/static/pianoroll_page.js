document.addEventListener('DOMContentLoaded', () => {
    
    const sequencerContainer = document.getElementById("sequencer-container");
    const sequencer = document.getElementById('sequencer');
    const labelsDiv = document.getElementById('labels');

    // Clear previous labels/tracks to prevent duplication
    labelsDiv.innerHTML = '';
    sequencer.innerHTML = '';

    const trackCount = 96;         // number of tracks
    const trackHeight = 20;       // per-track height
    const timelineWidthPx = 5000; // timeline width
    const gridSize = 10;
    let trackNotes = {};          // per-track note data
    let noteCounter = 0;

    sequencer.style.height = (trackCount * trackHeight) + 'px';                 // NUSTATOMAS VISO PIANOROLL ELEMENTO AUKŠTIS (priklauso nuo trackų skaičiaus)
    sequencerContainer.style.height = (trackCount * trackHeight) + 15 + "px";   // BE ŠITO APIBRĖŽIMO, BENDRAI PIANOROLL EILIŲ MATOSI TIK TIEK AUKŠČIO, KIEK YRA JO NUSTATYTA VISO PIANOROLL MATOMAM SCROLL LANGE (pvz., 550px), O NE VISAS (pvz., 1920px=96*20) 
    labelsDiv.style.height = (trackCount * trackHeight) + 15 + "px";            // BE ŠITO APIBRĖŽIMO, LABELSDIV ELEMENTO AUKŠTIS KAŽKODĖL PATS SUMAŽĖJA (KIEKVIENAS LABEL BOX UŽIMA 95,8PX, O NE 100PX), TAMPA NELYGUS TRACK EILUČIŲ AUKŠČIUI. Čia aiškiai apibrėžiam, kad labelsDiv (html id="labels") aukštis yra 1000px (100*10)          

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
        
        const pitchRowLabel = document.createElement('div');
        pitchRowLabel.className = "pitchRowLabel";
        pitchRowLabel.setAttribute("id", "pitchRow-" + (i+1) + "-label");
        //pitchRowLabel.textContent = "P" + (i+1);
        pitchRowLabel.style.height = trackHeight + "px";
        pitchRowLabel.style.background = "white";
        pitchRowLabel.style.color = "black";
        pitchRowLabel.style.display = "flex";
        pitchRowLabel.style.justifyContent = "center";
        pitchRowLabel.style.borderBottom = "1px solid #333";
        // SUŽYMIMOS NATŲ RAIDĖS (C, D, ...)
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
        // NUSPALVINA JUODUS KLAVIŠUS IR SUŽYMI GROTAŽYMES
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
        // SUŽYMI OKTAVOS SKAIČIUS
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
        labelsDiv.appendChild(pitchRowLabel);                       

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
        note.style.top = (parseInt(trackId) * trackHeight + 2) + 'px';

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


    // vvv PLAYBACK LINIJOS VIZUALUS FUNKCIONALUMAS vvv

    let playhead = null;
    let isPlaying = false;
    let startTimestamp = null; // laiko momentas, kai buvo pradėtas grojimas
    let pauseOffset = 0;        // how far into the track we've played (ms)
    let pixelsPerMs = 0.2;      // adjust depending on zoom / scale
    let totalDuration = 60000;  // full sequencer length in ms (override later)=(GALIMAS PAKEIST, PVZ., PAGAL PASKUTINIO TRACKUOSE ESANČIO NATŲ BLOCKO PABAIGĄ!)

    // kad, tik užkrovus puslapį, js kintamajam playhead būtų priskirtas playback html elementas (jo id "playback")
    /*document.addEventListener("DOMContentLoaded", () => {*/
    playhead = document.getElementById("playhead");
    /*});*/

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

    function playPlayback() {
        if (isPlaying) return;
        isPlaying = true;
        startTimestamp = null;  // reset internal timer, but NOT pauseOffset

        requestAnimationFrame(updatePlayhead);
    }

    function pausePlayback() {
        if (!isPlaying) return; // jeigu negroja, tai šios funkcijos ir nevykdyt
        isPlaying = false;
        const currentTime = performance.now(); // paimamas laikas, praėjęs nuo apskritai pradžios (nuo puslapio pakrovimo pradžios?)
        // čia kad nevykdytų skaičiavimų ant null
        if (startTimestamp !== null) {
            pauseOffset += currentTime - startTimestamp;
        }
    }

    function stopPlayback() {
        isPlaying = false;
        pauseOffset = 0;
        startTimestamp = null;
        playhead.style.transform = `translateX(0px)`;
    }

    const playButton = document.getElementById("playButton");
    const pauseButton = document.getElementById("pauseButton");
    const returnButton = document.getElementById("returnButton");

    if (playButton) playButton.addEventListener('click', playPlayback);
    if (pauseButton) pauseButton.addEventListener('click', pausePlayback);
    if (returnButton) returnButton.addEventListener('click', stopPlayback);

    sequencerContainer.addEventListener("scroll", () => {
        const offset = sequencerContainer.scrollLeft;
        playhead.style.left = `${-offset}px`;
    });




    // NATŲ DUOMENŲ SIUNTIMO BACKENDAN FUNKCIJA (galimai tobulintina)
    function sendAllNotesToBackend() {
        fetch('/update_tracks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(trackNotes)
        }).catch(err => console.warn('Backend sync failed:', err));
    }

});