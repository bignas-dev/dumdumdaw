// Function to generate and retrieve a persistent user fingerprint
function getFingerprint() {
    let fp = localStorage.getItem('user_fingerprint');
    if (!fp) {
        // Simple UUID-like generation for a persistent unique ID
        fp = 'fp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('user_fingerprint', fp);
    }
    return fp;
}
const USER_FINGERPRINT = getFingerprint();

// --- UTILITIES ---
const TicksToPx = (ticks) => ticks / 10;
const PxToTicks = (px) => px * 10;
const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;

function prepareInstrumentNameForDisplay(instrument) {
    return instrument.split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
// --- END UTILITIES ---


document.addEventListener('DOMContentLoaded', async () => {

    // AUDIO OBJEKTUI
    let mainAudio;
    let isAudioLoading = false;
    let mainBlockData = [];

    // Priskiriam JS kintamuosius esminiams html sequencerio elementams
    const sequencerContainer = document.getElementById("sequencer-container");
    const sequencer = document.getElementById('sequencer');
    const labelsDiv = document.getElementById('labels');
    const playhead = document.getElementById("playhead");

    labelsDiv.innerHTML = '';
    sequencer.innerHTML = '';

    let trackNotes = {};
    let noteCounter = 0;
    let instrumentList = [
        {value: "", text: "Choose instrument"}
    ];
    let trackInstruments = {};

    // CENTRALIZING AWAIT CALLS
    await Promise.all([
        getMainComposition(),
        getInstrumentsAndAddToList(),
        getTrackInstruments()
    ]);

    console.log(mainBlockData);

    // ========================================= SEQUENCER KOMPONENTŲ DALIS =========================================

    const trackCount = 15;
    const trackHeight = 100;
    const timelineWidthPx = 10000;
    const gridSize = 10;
    const barLineGapLengthPx = 40;
    
    // Optimized DOM/Style application
    const totalSequencerHeight = trackCount * trackHeight;
    sequencer.style.height = totalSequencerHeight + 'px';
    sequencerContainer.style.height = totalSequencerHeight + 15 + 'px';
    labelsDiv.style.height = totalSequencerHeight + 15 + 'px';
    
    const trackElements = {};

    // ========== TRACKŲ SUKŪRIMO DALIS (didelis for loopas) ==========

    for (let i = 0; i < trackCount; i++) {
        const trackId = String(i + 1);
        const topPosition = i * trackHeight;

        // --- Track Element (Sequencer) ---
        const track = document.createElement('div');
        track.className = 'track';
        track.dataset.trackId = trackId;
        
        track.style.cssText = `
            position: absolute;
            left: 0px;
            top: ${topPosition}px;
            width: ${timelineWidthPx}px;
            height: ${trackHeight}px;
            background: ${(i % 2 === 0) ? '#0d1821' : '#142532'};
            border-bottom: 1px solid #333;
        `;
        sequencer.appendChild(track);
        trackElements[trackId] = track;

        // --- RESTORED BLOCK CREATION / PIANO ROLL NAVIGATION ---
        track.addEventListener("dblclick", () => {
            openPianorollForTrack(trackId);
        });
        // --------------------------------------------------------

        trackNotes[i] = [];

        // --- Label Box ---
        const labelBox = document.createElement('div');
        labelBox.id = `track-${trackId}-box`;
        
        // CRITICAL FIX: Ensure ALIGNMENT using border-box
        labelBox.style.cssText = `
            height: ${trackHeight}px;
            background: #253644;
            border-bottom: 1px solid #333;
            padding: 10px 10px;
            display: flex;
            flex-direction: column;
            box-sizing: border-box; /* FIX: Guarantees total height is 100px */
            justify-content: space-between;
        `;
        
        // Labelo pats tekstas
        const label = document.createElement('div');
        label.id = `track-${trackId}-label`;
        label.textContent = `Track ${trackId}`;
        label.style.flex = '1';

        // PAŠALINTA: Anksčiau čia buvo kodo eilutės, kurios kūrė 'parametersButton' (P mygtuką).
        // Jos dabar yra visiškai pašalintos.

        // ===== Instrumento pasirinkimo dropdown sąrašas =====
        const selectInstrument = document.createElement('select');
        selectInstrument.className = "selectInstrument";
        selectInstrument.name = `selectInstrument${trackId}`;
        selectInstrument.id = `selectInstrument${trackId}`;

        const assignedInstrument = trackInstruments[trackId];

        if (assignedInstrument) {
            const instrumentOption = document.createElement("option");
            instrumentOption.value = assignedInstrument;
            instrumentOption.textContent = prepareInstrumentNameForDisplay(assignedInstrument);
            selectInstrument.appendChild(instrumentOption);
        } else {
            instrumentList.forEach(opt => {
                const instrumentOption = document.createElement('option');
                instrumentOption.value = opt.value;
                instrumentOption.textContent = opt.text;
                selectInstrument.appendChild(instrumentOption);
            });
        }
        
        // Final assembly
        labelBox.appendChild(label);
        labelBox.appendChild(selectInstrument);
        // PAŠALINTA: Iš `labelBox` surinkimo pašalintas mygtukas.
        labelsDiv.appendChild(labelBox);
    }


    // ========== TAKTO LINIJŲ SUKŪRIMO (Bar Lines) ==========

    const totalBarLines = Math.floor(timelineWidthPx / barLineGapLengthPx);
    const barLinesFragment = document.createDocumentFragment(); 

    for (let i = 1; i < totalBarLines; i++) {
        let barLine = document.createElement("div");
        barLine.className = "barLine";
        const leftPosition = i * barLineGapLengthPx;
        
        barLine.style.cssText = `
            left: ${leftPosition}px;
            background: ${(i % 4 === 0) ? '#777777' : '#333333'};
        `;
        barLinesFragment.appendChild(barLine);
    }
    sequencerContainer.appendChild(barLinesFragment);


    // ============================== SEQUENCERIO ESMINIŲ FUNKCIONALUMŲ DALIS ==============================

    placeBlocksInSequencer(mainBlockData);

    // ========== ESAMŲ BLOKŲ VIZUALUS SUDĖLIOJIMAS SEQUENCERY ==========
    function placeBlocksInSequencer(mainBlockData) {
        const blocksFragment = document.createDocumentFragment(); 

        mainBlockData.forEach(function(singleBlock) {
            const blockId = singleBlock[0];
            const [trackOfBlock] = blockId.split("_");
            const trackElement = trackElements[trackOfBlock];

            if (!trackElement) return;

            const block = document.createElement('div');
            block.className = "noteBlock";
            block.id = blockId;
            
            const leftPx = TicksToPx(singleBlock[1]); 
            const widthPx = TicksToPx(singleBlock[2]);
            const topPx = (parseInt(trackOfBlock) - 1) * trackHeight + 10; 

            block.style.cssText = `
                left: ${leftPx}px;
                width: ${widthPx}px;
                top: ${topPx}px;
            `;

            const blockHandle = document.createElement("div");
            blockHandle.className = 'blockHandle';
            block.appendChild(blockHandle);

            const blockLabels = document.createElement("div");
            blockLabels.className = "blockLabels";
            block.appendChild(blockLabels);

            const blockDate = document.createElement("div");
            blockDate.className = "blockDate";
            
            const blockParts = blockId.split("_");
            const dateStr = `${blockParts[2]} ${blockParts[3]}`;
            
            blockDate.innerHTML = dateStr;
            blockDate.title = dateStr;
            blockLabels.appendChild(blockDate);

            blocksFragment.appendChild(block);

            // makeDraggable(block); // Disabled

            blockLabels.addEventListener("dblclick", () => {
                openPianorollOfExistingBlock(block.id);
            });
        });
        
        sequencer.appendChild(blocksFragment);
    }
    
    // ========== NATŲ-BLOKŲ STUMDYMO PELE FUNKCIJA (LOCKED IN PLACE) ==========
    function makeDraggable(block) {
        // FULL LOCK: Blocks are completely undraggable
        return; 
        
        let offsetX;
        let finalNewLeft = null;

        block.addEventListener('mousedown', (e) => {
            if (e.target.className !== 'blockHandle') return;

            offsetX = e.clientX - block.getBoundingClientRect().left;

            function mouseMoveHandler(e) {
                const rect = sequencer.getBoundingClientRect();
                let newLeft = e.clientX - rect.left - offsetX;
                newLeft = Math.max(0, Math.min(newLeft, timelineWidthPx - block.offsetWidth));
                
                newLeft = snapToGrid(newLeft, gridSize); 
                block.style.left = newLeft + 'px';

                const indexOfDraggedBlock = mainBlockData.findIndex(singleBlock => singleBlock[0] === block.id);
                if (indexOfDraggedBlock !== -1) {
                    mainBlockData[indexOfDraggedBlock][1] = PxToTicks(newLeft); 
                    finalNewLeft = newLeft;
                }
            }

            function mouseUpHandler() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);

                if (finalNewLeft !== null) {
                    saveMainComposition();
                    if (mainAudio && mainAudio.src) {
                        URL.revokeObjectURL(mainAudio.src);
                    }
                    mainAudio = null;
                    console.log(`Block ${block.id} moved and composition saved. Main audio invalidated. New start time: ${PxToTicks(finalNewLeft)}ms`);
                }
            }

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    // ========== NAUJO NATŲ BLOKO PIANOROLLO ATIDARYMO FUNKCIJA ==========
    function openPianorollForTrack(trackId) {
        let selectElement = document.getElementById("selectInstrument" + trackId);
        let chosenInstrument = selectElement.value;
        
        if (!chosenInstrument) {
            let backgroundOfSelect = selectElement.style.background;
            selectElement.style.background = "#ff0000";
            setTimeout(function(){ selectElement.style.background = backgroundOfSelect }, 250);
            return;
        };

        saveMainComposition();
        
        const finalUrl = new URL(`/pianoroll`, window.location.origin);
        finalUrl.searchParams.set("track", trackId);
        finalUrl.searchParams.set("instrument", chosenInstrument);

        window.open(finalUrl.href, "_self");
    }

    // ========== PASIRINKTO ESAMO NATŲ BLOKO PIANOROLLO ATIDARYMAS ==========
    function openPianorollOfExistingBlock(blockId) {
        saveMainComposition();

        let blockNameParameters = blockId.split("_");
        const trackId = blockNameParameters[0];
        const blockInstrument = blockNameParameters[1];

        const finalUrl = new URL(`/pianoroll`, window.location.origin);
        
        finalUrl.searchParams.set("track", trackId);
        finalUrl.searchParams.set("instrument", blockInstrument);
        finalUrl.searchParams.set("block", blockId);

        window.open(finalUrl.href, "_self");
    }

    // ============================== RYŠIO SU BACKENDU FUNKCIJOS ==============================

    // ========== SEQUENCERIO KOMPOZICIJOS IŠSAUGOJIMAS ==========
    const saveCompositionButton = document.getElementById("saveComposition");
    if (saveCompositionButton) saveCompositionButton.addEventListener('click', saveMainComposition);

    function saveMainComposition() {
        const preparedCompositionData = {
            sequence: mainBlockData, 
            fingerprint: USER_FINGERPRINT
        };
        console.log("Saving composition:", preparedCompositionData);

        fetch("/save_main", {
            method: 'POST',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(preparedCompositionData)
        })
        .then(response => response.json())
        .then(data => console.log("Successfully saved:", data))
        .catch(error => console.warn("Save to backend failed:", error));
    }
    
    // ========== SEQUENCERIO KOMPOZICIJOS GAVIMAS IR PAKROVIMAS ==========
    async function getMainComposition() {
        if (!USER_FINGERPRINT || typeof USER_FINGERPRINT !== 'string' || USER_FINGERPRINT.trim() === '') {
            console.warn("USER_FINGERPRINT is missing or invalid. Cannot fetch composition.");
            mainBlockData = [];
            return;
        }

        try {
            const url = `/get_main?fingerprint=${encodeURIComponent(USER_FINGERPRINT)}`;
            
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status} for URL: ${url}`);
                throw new Error(`Server returned status ${response.status}`);
            }

            const data = await response.json();
            mainBlockData = data;
            console.log("Main composition loaded:", mainBlockData);
        } catch (error) {
            console.error("Failed to fetch main composition:", error);
            mainBlockData = [];
        }
    }

    // ========== ESAMŲ INSTRUMENTŲ GAVIMAS (iš backend) ==========
    async function getInstrumentsAndAddToList() {
        try {
            const response = await fetch(`/get_instruments`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}.`);
            }

            const data = await response.json();
            const instrumentsData = data;
            
            const instrumentArray = Object.keys(instrumentsData);

            instrumentArray.forEach(instrument => {
                let capitalizedInstrumentName = prepareInstrumentNameForDisplay(instrument);
                instrumentList.push({value: instrument, text: capitalizedInstrumentName});
            });
        } catch (error) {
            console.error("Failed to fetch or process instruments:", error);
        }
    }

    // ========== TRACKAM PRISKIRTŲ INSTRUMENTŲ SĄRAŠO GAVIMAS ==========
    async function getTrackInstruments() {
        try {
            const response = await fetch(`/get_track_instruments?fingerprint=${USER_FINGERPRINT}`)
            const data = await response.json();
            trackInstruments = data;
        } catch (error) {
            console.error("Failed to fetch track instruments:", error);
            trackInstruments = {};
        }
    }


    // ============================== ĮRAŠŲ FUNKCIONALUMAS (PLAY, PAUSE, STOP, EXPORT) ==============================

    // ========== KOMPOZICIJOS ĮRAŠO GAVIMAS IŠ BACKENDO ==========
    async function getAudioForPlay() {
        if (mainAudio || isAudioLoading) return Promise.resolve();

        isAudioLoading = true;

        return fetch(`/play_main?fingerprint=${USER_FINGERPRINT}`, {
            method: 'POST'
        })
        .then(async response => {
            if (!response.ok) throw new Error ("Main audio retrieval error " + response.status);

            const audioBlob = await response.blob();

            if (mainAudio && mainAudio.src) URL.revokeObjectURL(mainAudio.src);

            const audioUrl = URL.createObjectURL(audioBlob);
            mainAudio = new Audio(audioUrl);
            
            isAudioLoading = false;
            console.log("Audio loaded and ready for playback.");
        })
        .catch(error => {
            isAudioLoading = false;
            console.warn("Error playing main sequence:", error);
            throw error;
        });
    }

    // ==================== GROJIMO IR PLAYBACK LINIJOS VIZUALUS FUNKCIONALUMAS ====================
    let isPlaying = false;
    let startTimestamp = null;
    let pauseOffset = 0;
    let pixelsPerMs = 0.1;
    const totalDuration = timelineWidthPx / pixelsPerMs;


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
            stopPlayback();
        }
    }


    // ========== GROJIMO FUNKCIJA (ĮRAŠAS + LINIJA) ==========
    function playPlayback() {
        if (isPlaying) return;
        
        getAudioForPlay()
            .then(() => {
                if (mainAudio) {
                    mainAudio.play();

                    isPlaying = true;
                    startTimestamp = null;
                    requestAnimationFrame(updatePlayhead);
                } else {
                    console.error("Playback failed: mainAudio is not initialized.");
                }
            })
            .catch(error => {
                console.error("Could not start playback because of a loading error:", error);
            });
    }

    // ========== PAUZĖS FUNKCIJA (ĮRAŠAS + LINIJA) ==========
    function pausePlayback() {
        if (!isPlaying || !mainAudio) return;

        mainAudio.pause();
        
        isPlaying = false;
        const currentTime = performance.now();
        
        if (startTimestamp !== null) {
            pauseOffset += currentTime - startTimestamp;
        }
    }

    // ========== STABDYMO FUNKCIJA (ĮRAŠAS + LINIJA) ==========
    function stopPlayback() {
        if (!mainAudio) return;

        mainAudio.pause();
        mainAudio.currentTime = 0;
        
        isPlaying = false;
        pauseOffset = 0;
        startTimestamp = null;
        playhead.style.transform = `translateX(0px)`;
    }


    // ========== LINIJOS JUDĖJIMO SCROLLINANT (horizontaliai) SUTVARKYMAS ==========
    sequencerContainer.addEventListener("scroll", () => {
        const offset = sequencerContainer.scrollLeft;
        playhead.style.transform = `translateX(${-offset}px)`; 
    });

    // ========== PLAY, PAUSE, STOP MYGTUKŲ FUNKCIONALUMAS ==========

    const playButton = document.getElementById("playButton");
    const pauseButton = document.getElementById("pauseButton");
    const returnButton = document.getElementById("returnButton");

    if (playButton) playButton.addEventListener('click', playPlayback);
    if (pauseButton) pauseButton.addEventListener('click', pausePlayback);
    if (returnButton) returnButton.addEventListener('click', stopPlayback);


    // ========== KOMPOZICIJOS ĮRAŠO ATSISIUNTIMAS !!!!!!! ==========
    function downloadMainAudio() {
        console.log("Starting audio download...");

        fetch(`/play_main?fingerprint=${USER_FINGERPRINT}`, {
            method: 'POST',
        })
        .then(async response => {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Download failed with status ${response.status}: ${errorText}`);
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = audioUrl;
            downloadLink.download = 'composition.wav'; 
            
            downloadLink.click();
            
            URL.revokeObjectURL(audioUrl);
            console.log("Download initiated for composition.wav");
        })
        .catch(error => {
            console.error('Error during audio download:', error);
            alert(`Failed to download audio: ${error.message}`);
        });
    }

    // Attach this function to your download button
    const downloadButton = document.getElementById("exportButton");
    if (downloadButton) downloadButton.addEventListener('click', downloadMainAudio);
    
});
