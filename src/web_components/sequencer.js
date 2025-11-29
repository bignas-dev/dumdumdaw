document.addEventListener('DOMContentLoaded', async () => {

    // AUDIO OBJEKTUI
    let mainAudio;
    // Booleanas, nurodantis audio krovimo (iš backendo) padėtį:
    let isAudioLoading = false;
    
    let mainBlockData = [];

    await getMainComposition();      // Be "await", natų blokų duomenys nėra laiku užkraunami. Dėl to ir visa dengianti addeventlistener funkcija turi async.
    console.log(mainBlockData);

    
    // priskiriam JS kintamuosius esminiams html sequencerio elementams
    const sequencerContainer = document.getElementById("sequencer-container");
    const sequencer = document.getElementById('sequencer');
    const labelsDiv = document.getElementById('labels');

    // Clear previous labels/tracks to prevent duplication
    labelsDiv.innerHTML = '';
    sequencer.innerHTML = '';

    // Natų-blokų duomenų rinkimo kintamieji (KURIANT BACKENDĄ, GALI REIKT ŠIUOS KINTAMUOSIUS PAKEIST) {BACKEND}
    let trackNotes = {};             // per-track note data
    let noteCounter = 0;             // pradinis natų-blokų skaičius (0)


    // ========== INSTRUMENTŲ DALIS ==========


    // INICIJUOJAMAS DAW'O INSTRUMENTŲ SĄRAŠAS [reikalinga instrumentų dropdown meniui], JĮ UŽPILDYSIM IŠ BACKEND GAUTAIS DUOMENIMIS
    let instrumentList = [
            {value: "", text: "Choose instrument"}
            // ....
    ];
    
    await getInstrumentsAndAddToList();      // iš backendo gaunamas visų esamų instrumentų sąrašas ir visi instrumentai pridedami į frontende esantį instrumentList arrayų
    
    let trackInstruments = {};               // trackam priskirtų instrumentų duomenys

    await getTrackInstruments();             // prideda esamus duomenis apie trackų instrumentų priskyrimus


    // ========================================= SEQUENCER KOMPONENTŲ DALIS =========================================

    const trackCount = 15;          // number of tracks
    const trackHeight = 100;        // per-track height
    const timelineWidthPx = 10000; // timeline width
    const gridSize = 10;         // grid'o plotis (pikseliais) = minimalus natos elemento ilgis = minimalus natos elemento pastūmimo kelias

    // Sequencerio html elementų aukščiai
    sequencer.style.height = (trackCount * trackHeight) + 'px';              // NUSTATOMAS VISO SEQUENCER ELEMENTO AUKŠTIS (priklauso nuo trackų skaičiaus)
    sequencerContainer.style.height = (trackCount * trackHeight) + 15 + 'px';    // BE ŠITO APIBRĖŽIMO, BENDRAI TRACK EILIŲ MATOSI TIK TIEK PIKSELIŲ, KIEK YRA NUSTATYTA VISO SEQUENCER MATOMAM SCROLL LANGE (pvz., 550px), O NE VISI (pvz., 1000px=10*100) 
    labelsDiv.style.height = (trackCount * trackHeight) + 15 + 'px';             // BE ŠITO APIBRĖŽIMO, LABELSDIV ELEMENTO AUKŠTIS KAŽKODĖL PATS SUMAŽĖJA (KIEKVIENAS LABEL BOX UŽIMA 95,8PX, O NE 100PX), TAMPA NELYGUS TRACK EILIUČIŲ AUKŠČIUI. Čia aiškiai apibrėžiam, kad labelsDiv (html id="labels") aukštis yra 1000px (100*10)
                                    

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
        track.style.background = (i % 2 === 0) ? '#0d1821' : '#142532';      // tracko fono spalva (dvi spalvos, nes kas antras trackas yra tamsesnis, kas antras yra šviesesnis)
        track.style.borderBottom = '1px solid #333';
        sequencer.appendChild(track);
        
        track.addEventListener("dblclick", e => {
            const trackId = track.dataset.trackId;
            openPianorollForTrack(trackId);
            
        });
        // Trackų numeracija trackNotes Objecte {'i' : [...]} {BACKEND}
        trackNotes[i] = [];          // paruošia vietą i-tojo tracko natoms trackNotes sąraše

        // Labelai 
                                        
        // Labelo elementų "konteineris" (div elementas)                          
        const labelBox = document.createElement('div');
        labelBox.setAttribute("id", "track-" + (i+1) + "-box");
        labelBox.style.height = trackHeight + 'px';
        labelBox.style.background = '#253644';
        labelBox.style.borderBottom = '1px solid #333';
        labelBox.style.padding = '10px 10px';
        labelBox.style.display = "flex";
        labelBox.style.flexDirection = "column";

        
        // Labelo pats tekstas (pvz., Track 1)                                
        const label = document.createElement('div');
        label.setAttribute("id", "track-" + (i+1) + "-label");             // prie kiekvieno label langelio elemento prideda html ID atributą (tikslas — tokiu būdu būtų galima customizint būtent 'Track 1' label langelį, kad būtų galima jo top-left kampą padaryti apvalų (apvalint TIK bendro visų labelų elemento top-left kampą nepavyksta, nes tuo atveju tą apvalintą kampą tiesiog užstoja "Track 1" label langelis, jo nesimato; dėl to reikia apvalint IR bendro visų labelų elemento top-left kampą, IR "Track 1" label langelio top-left kampą))
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

        parametersButton.addEventListener('click', e => {
            const trackId = track.dataset.trackId;
            openPianorollForTrack(trackId);
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

        if (trackInstruments[i+1]) {
            // Jeigu trackui instrumentas jau parinktas, tai pridedamas tik to instrumento pasirinkimas.
            const instrumentOption = document.createElement("option");
            instrumentOption.value = trackInstruments[i+1];
            instrumentOption.textContent = prepareInstrumentNameForDisplay(trackInstruments[i+1]);
            selectInstrument.appendChild(instrumentOption);
        }
        else {
            // Pridedamas kiekvienas instrumento pasirinkimas į instrumentų pasirinkimo sąrašą {BACKEND}
            instrumentList.forEach(opt => {
            const instrumentOption = document.createElement('option');
            instrumentOption.value = opt.value;
            instrumentOption.textContent = opt.text;
            selectInstrument.appendChild(instrumentOption);
            });
        }
        

        // Į bendrą parent label box konteinerį sudedami visi jo elementai, ir pats label box į visų labelų bendrą konteinerį
        labelBox.appendChild(label)
        labelBox.appendChild(parametersVolumeButtonsContainer);
        labelBox.appendChild(selectInstrument);
        labelsDiv.appendChild(labelBox);
                                                 
    }


    // ========== TAKTO LINIJŲ SUKŪRIMO ==========

    const barLineGapLengthPx = 40;

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

        sequencerContainer.appendChild(barLine);

    }



    // ============================== SEQUENCERIO ESMINIŲ FUNKCIONALUMŲ DALIS (natų-blokų automatinis dėjimas, trynimas, stumdymas) ==============================
    // NOTE: Galų gale blokų įdėjimo pele ir blokų tampymo funkcijos turės būti pašalintos!

    // Vizualių blokų sukūrimo funkcija iškviečiama čia, nes pirma reikia, kad būtų sukurtas visas sequenceris
    placeBlocksInSequencer(mainBlockData);      // [[name, start, duration], [.., .., ..], ...]


    // ========== ESAMŲ BLOKŲ VIZUALUS SUDĖLIOJIMAS SEQUENCERY ==========   

    function placeBlocksInSequencer(mainBlockData) {

        mainBlockData.forEach(function(singleBlock) {

            const blockNameParameters = singleBlock[0].split("_");
            const trackOfBlock = blockNameParameters[0];

            const block = document.createElement('div'); // kiekvienam duombazėj esančiam natų blokui sukuriamas html elementas (bus vizualus blokas)
            block.className = "noteBlock";
            block.id = singleBlock[0];
            block.style.left = singleBlock[1] / 10  + "px";
            block.style.width = singleBlock[2] / 10  + "px";
            block.style.top = (((parseInt(trackOfBlock)) - 1) * trackHeight + 10) + "px";

            const blockHandle = document.createElement("div");
            blockHandle.className = 'blockHandle';
            block.appendChild(blockHandle);

            const blockLabels = document.createElement("div");
            blockLabels.className = "blockLabels";
            block.appendChild(blockLabels);

            const blockDate = document.createElement("div");
            blockDate.className = "blockDate"
            blockDate.innerHTML = blockNameParameters[2] + " " + blockNameParameters[3];
            blockDate.title = blockNameParameters[2] + " " + blockNameParameters[3];
            blockLabels.appendChild(blockDate);

            sequencer.appendChild(block);

            makeDraggable(block);

            blockLabels.addEventListener("dblclick", () => {
                const blockId = block.id;
                console.log(blockId);
                openPianorollOfExistingBlock(blockId);
            });

        });

    }
    

// ========== NATŲ-BLOKŲ STUMDYMO PELE FUNKCIJA (LOCKED IN PLACE) ==========

    function makeDraggable(block) {
        // FULL LOCK: Blocks are completely undraggable
        return; // This immediately exits the function, preventing any drag event listeners from being added
        
        // The rest of the dragging code is now disabled and won't execute
        let offsetX;
        let finalNewLeft = null; // Store the final position in pixels

        block.addEventListener('mousedown', (e) => {
            // This entire block is now unreachable due to the return statement above
            if (e.target.className !== 'blockHandle') return;

            offsetX = e.clientX - block.getBoundingClientRect().left;

            function mouseMoveHandler(e) {
                const rect = sequencer.getBoundingClientRect();
                let newLeft = e.clientX - rect.left - offsetX;
                newLeft = Math.max(0, Math.min(newLeft, timelineWidthPx - block.offsetWidth));
                newLeft = Math.round(newLeft / gridSize) * gridSize;
                block.style.left = newLeft + 'px';

                const indexOfDraggedBlock = mainBlockData.findIndex(singleBlock => singleBlock[0] === block.id);
                if (indexOfDraggedBlock !== -1) {
                    mainBlockData[indexOfDraggedBlock][1] = newLeft * 10;
                    finalNewLeft = newLeft; 
                }
            }

            function mouseUpHandler() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);

                if (finalNewLeft !== null) {
                    // A. Persist the updated data to the backend
                    saveMainComposition();

                    // B. Invalidate the audio object
                    if (mainAudio && mainAudio.src) {
                        URL.revokeObjectURL(mainAudio.src);
                    }
                    mainAudio = null;
                    console.log(`Block ${block.id} moved and composition saved. Main audio invalidated. New start time: ${finalNewLeft * 10}ms`);
                }
            }

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }


    // ========== NAUJO NATŲ BLOKO PIANOROLLO ATIDARYMO FUNKCIJA ==========
    
    function openPianorollForTrack(trackId) {

        let chosenInstrument = document.getElementById("selectInstrument" + trackId).value;
        
        if (!chosenInstrument) {
            let selectOfInstrumentlessTrack = document.getElementById(`selectInstrument${trackId}`);
            backgroundOfSelect = selectOfInstrumentlessTrack.style.background;
            selectOfInstrumentlessTrack.style.background = "#ff0000";
            setTimeout(function(){ selectOfInstrumentlessTrack.style.background = backgroundOfSelect }, 250);
            return;
        };


        // Išsaugo sequencerio kompoziciją
        saveMainComposition();
        
        const finalUrl = new URL(`/pianoroll`, window.location.origin);
        // Set the required parameters directly on the URL object
        finalUrl.searchParams.set("track", trackId);
        finalUrl.searchParams.set("instrument", chosenInstrument);

        // Navigate to the constructed URL
        window.open(finalUrl.href, "_self");
        
    }


    // ========== PASIRINKTO ESAMO NATŲ BLOKO PIANOROLLO ATIDARYMAS (redagavimui ar pan.) ==========

    function openPianorollOfExistingBlock(blockId) {
        // Saves the sequencer composition state before navigating
        saveMainComposition(); 

        // 1. Parse the blockId to extract parameters.
        // Assuming blockId format is "trackId_blockInstrument_creationDate"
        let blockNameParameters = blockId.split("_");

        // The first element is the track ID
        const trackId = blockNameParameters[0]; 
        // The second element is the instrument name
        const blockInstrument = blockNameParameters[1]; 

        // 2. Construct the final URL directly, bypassing the API call.
        const finalUrl = new URL(`/pianoroll`, window.location.origin);
        
        // Set the required parameters directly on the URL object
        finalUrl.searchParams.set("track", trackId);
        finalUrl.searchParams.set("instrument", blockInstrument);
        finalUrl.searchParams.set("block", blockId); // Pass the original full blockId for reference

        // 3. Navigate to the constructed URL
        window.open(finalUrl.href, "_self");
    }

    


    // ============================== RYŠIO SU BACKENDU (TIESIOGIAI/NETIESIOGIAI) FUNKCIJOS ==============================



    // ========== SEQUENCERIO KOMPOZICIJOS IŠSAUGOJIMAS (matyt bus vykdomas kai: 1. paspaudžiama play (grojimą gi vykdys);  2. kaip nors išeinama iš puslapio (pvz., pianorollan, bet ir main page'an)) ==========
    
    const saveCompositionButton = document.getElementById("saveComposition");
    saveCompositionButton.addEventListener('click', saveMainComposition);

    function saveMainComposition() {

        const preparedCompositionData = {sequence: mainBlockData};  // mainBlockData = [[name, start, duration], [x,y,z], ...]
        console.log(preparedCompositionData);

        fetch("http://localhost:6767/save_main", {
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

        try {
            const response = await fetch("http://localhost:6767/get_main");
            const data  = await response.json();
            mainBlockData = data;
            console.log(mainBlockData); // [[name, start, duration], [.., .., ..], ...]
        } catch (error) {
            console.error("Failed to fetch main composition:", error);
            // Initialize with empty data on failure
            mainBlockData = []; 
        }

    }


    // ========== ESAMŲ INSTRUMENTŲ GAVIMAS (iš backend) ==========

    async function getInstrumentsAndAddToList() {

        try {
            // Instrumentų gavimas
            const response = await fetch("http://localhost:6767/get_instruments")
            const data = await response.json();
            const instrumentsData = data;       // {instrumentas1 : ['C1', 'Cs1', ...], instrumentas2 : [...], ...}
            console.log(instrumentsData);

            // Instrumentų integravimas sequencer puslapio frontende

            const instrumentArray = Object.keys(instrumentsData);
            console.log(instrumentArray);

            instrumentArray.forEach(instrument => {

                // Paruošim instrumentų vardus (text: ...), kad prasidėtų didžiosiomis raidėmis ir pan.
                let capitalizedInstrumentName = prepareInstrumentNameForDisplay(instrument);    // padarys visus instrumento pavadinimo žodžius iš didžiosios raidės

                instrumentList.push({value: instrument, text: capitalizedInstrumentName});
            })
        } catch (error) {
            console.error("Failed to fetch instruments:", error);
        }
    }

    // ===== Instrumento vardų (rodysimų instrumentų dropdown meniuje) paruošimas (kad būtų iš didž. raidės) =====

    function prepareInstrumentNameForDisplay(instrument) {

        let splitInstrName = instrument.split(" ")
        let listOfWordsInInstrName = [];
        splitInstrName.forEach(word => {
            let capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
            listOfWordsInInstrName.push(capitalizedWord);
        });
        let capitalizedInstrumentName = listOfWordsInInstrName.join(" ");

        return capitalizedInstrumentName;
    }



    // ========== TRACKAM PRISKIRTŲ INSTRUMENTŲ SĄRAŠO GAVIMAS ==========

    async function getTrackInstruments() {

        try {
            const response = await fetch("http://localhost:6767/get_track_instruments")
            const data = await response.json();
            trackInstruments = data;
        } catch (error) {
            console.error("Failed to fetch track instruments:", error);
            trackInstruments = {}; // Initialize with empty object on failure
        }

    }




    // ============================== ĮRAŠŲ FUNKCIONALUMAS (ĮRAŠŲ GAVIMAS, GROJIMAS (PLAY, PAUSE, STOP), EKSPORTAVIMAS (ATSISIUNTIMAS)) ============================== 


    // ========== KOMPOZICIJOS ĮRAŠO GAVIMAS IŠ BACKENDO ==========

    async function getAudioForPlay() {

        // CHANGE: Only load if mainAudio is NULL and we are not already loading
        if (mainAudio || isAudioLoading) return Promise.resolve();       // Promise — žymi async funkcijos užbaigimą

        isAudioLoading = true;

        // NOTE: The cleanup for mainAudio (URL.revokeObjectURL) is now done 
        // in makeDraggable or when a new audio is successfully loaded.

        return fetch("http://localhost:6767/play_main", {
            method: 'POST'
        })
        .then(async response => {
            if (!response.ok) throw new Error ("Main audio retrieval error " + response.status);

            const audioBlob = await response.blob();                         // perskaityt WAV duomenis kaip blob

            // Cleanup old audio object if it exists before creating a new one
            if (mainAudio && mainAudio.src) URL.revokeObjectURL(mainAudio.src); 

            const audioUrl = URL.createObjectURL(audioBlob);                 // WAV įrašą paverst laikinan audio objekto URL'an
            mainAudio = new Audio(audioUrl);                                 // sukuriamas audio objektas
            
            isAudioLoading = false;

            console.log("Audio loaded and ready for playback.");

        })
        .catch(error => {
            isAudioLoading = false;
            console.warn("Error playing main sequence:", error);
            throw error;
        });
            
        
    }


    // ==================== GROJIMO IR PLAYBACK LINIJOS VIZUALUS FUNKCIONALUMAS (play, pause, stop) ====================
    // Playback mygtukai turėtų turėt dvi paskirtis: 1. vizualią (linijos judėjimo kaitymas);  2. grojimo (įrašo grojimas/pristabdymas/sustabdymas) {BACKEND}

    let playhead = document.getElementById("playhead");
    let isPlaying = false;
    let startTimestamp = null;                               // laiko momentas, kai buvo pradėtas grojimas
    let pauseOffset = 0;                                     // how far into the track we've played (ms)
    let pixelsPerMs = 0.1;                                   // Playback linijos judėjimo greitis (px/ms)
    const totalDuration = timelineWidthPx / pixelsPerMs;     // Pilnas playback grojimo ilgis (priklauso nuo pianoroll ilgio ir judėjimo greičio). KOL KAS kintamasis yra CONST, bet jeigu padarytumėm automatinį pianorollo prasiplėtimą (kai natos artėja prie galo), tada bus LET.


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


    // ========== GROJIMO FUNKCIJA (ĮRAŠAS + LINIJA) ==========

    function playPlayback() {

        if (isPlaying) return;
        
        // Bandyt pakraut įrašą
        getAudioForPlay()
            .then(() => {
                // Nuo čia kodas tęsis tik tada, kai bus pakrautas įrašas (mainAudio audio objektas)
                if (mainAudio) {
                    // Prasidės įrašo grojimas
                    mainAudio.play();

                    // Prasidės linijos judėjimas
                    isPlaying = true;
                    startTimestamp = null; 
                    requestAnimationFrame(updatePlayhead);
                } else {
                    // Fallback if loading failed silently (should be caught by catch block)
                    console.error("Playback failed: mainAudio is not initialized.");
                }
            })
            .catch(error => {
                // Handle any error from the fetch/load process
                console.error("Could not start playback because of a loading error:", error);
            });
    }

    // ========== PAUZĖS FUNKCIJA (ĮRAŠAS + LINIJA) ==========

    function pausePlayback() {

        if (!isPlaying || !mainAudio) return;

        mainAudio.pause();       // sustabdo įrašą, nenumušant esamo grojimo laiko
        
        // Linijai:

        isPlaying = false;
        const currentTime = performance.now();  // paimamas laikas, praėjęs nuo apskritai pradžios (nuo puslapio pakrovimo pradžios?)
        
        // čia kad nevykdytų skaičiavimų ant null
        if (startTimestamp !== null) {
            pauseOffset += currentTime - startTimestamp;
        }

    }

    // ========== STABDYMO FUNKCIJA (ĮRAŠAS + LINIJA) ==========

    function stopPlayback() {

        if (!mainAudio) return;

        mainAudio.pause();
        mainAudio.currentTime = 0;       // perstato grojimo laiką į 0
        
        // Linijai:

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


    // ========== KOMPOZICIJOS ĮRAŠO ATSISIUNTIMAS !!!!!!! ==========

    function downloadMainAudio() {
        console.log("Starting audio download...");

        // Send the POST request to render the full sequence
        fetch("http://localhost:6767/play_main", {
            method: 'POST',
        })
        .then(async response => {
            if (!response.ok) {
                // Check if the server returned an error (e.g., 400 Bad Request, 404 Not Found)
                const errorText = await response.text();
                throw new Error(`Download failed with status ${response.status}: ${errorText}`);
            }
            
            // 1. Get the response as a Blob (binary data)
            const audioBlob = await response.blob();
            
            // 2. Create a temporary URL for the Blob
            // The browser can treat this URL as a local file.
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 3. Create a temporary <a> element
            const downloadLink = document.createElement('a');
            
            // 4. Set the link's href to the temporary URL
            downloadLink.href = audioUrl;
            
            // 5. Set the download attribute to specify the default filename
            // This filename is the one returned by your FastAPI backend: filename="music.wav"
            downloadLink.download = 'composition.wav'; 
            
            // 6. Simulate a click to start the download
            downloadLink.click();
            
            // 7. Clean up the temporary URL to free up memory
            // This is important for performance.
            URL.revokeObjectURL(audioUrl);
            
            console.log("Download initiated for my_composition.wav");
        })
        .catch(error => {
            console.error('Error during audio download:', error);
            alert(`Failed to download audio: ${error.message}`);
        });
    }

    // Attach this function to your download button
    const downloadButton = document.getElementById("exportButton");
    downloadButton.addEventListener('click', downloadMainAudio);
    

});
