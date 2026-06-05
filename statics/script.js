// MelodyMind Frontend Interactive Core
document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // 1. Mood Journal & LocalStorage Management
    // ----------------------------------------------------
    const journalKey = "melody_mind_journal";
    const metadataEl = document.getElementById("mood-metadata");

    if (metadataEl) {
        const mood = metadataEl.getAttribute("data-mood");
        const text = metadataEl.getAttribute("data-text");

        if (mood && text && text.trim() !== "") {
            // Prevent duplicate entries on page refresh
            const lastAddedText = sessionStorage.getItem("last_added_mood_text");
            if (lastAddedText !== text) {
                const entries = JSON.parse(localStorage.getItem(journalKey) || "[]");
                
                // Add to history
                entries.push({
                    mood: mood,
                    text: text.trim(),
                    timestamp: Date.now()
                });
                
                localStorage.setItem(journalKey, JSON.stringify(entries));
                sessionStorage.setItem("last_added_mood_text", text);
            }
        }
    }

    // Render timeline helper
    function renderJournal() {
        const journalContainer = document.getElementById("journal-timeline");
        if (!journalContainer) return;

        const entries = JSON.parse(localStorage.getItem(journalKey) || "[]");

        if (entries.length === 0) {
            journalContainer.innerHTML = `
                <div class="empty-journal">
                    <i class="fa-solid fa-feather-pointed"></i>
                    <p>No journal entries yet. Try analyzing your mood above!</p>
                </div>
            `;
            updateAnalytics([]);
            return;
        }

        // Sort newest first
        entries.sort((a, b) => b.timestamp - a.timestamp);

        const moodEmojis = {
            happy: "😊",
            sad: "😢",
            motivated: "🔥",
            calm: "🍃",
            energetic: "⚡"
        };

        journalContainer.innerHTML = entries.map(entry => {
            const dateStr = new Date(entry.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const emoji = moodEmojis[entry.mood] || "🎵";
            return `
                <div class="timeline-item">
                    <div class="timeline-header">
                        <span class="journal-mood-badge mood-${entry.mood}">${emoji} ${entry.mood}</span>
                        <span class="journal-time">${dateStr}</span>
                    </div>
                    <p class="journal-text">"${escapeHtml(entry.text)}"</p>
                </div>
            `;
        }).join('');

        // Render statistics dashboard
        updateAnalytics(entries);
    }

    function updateAnalytics(entries) {
        const statsChart = document.getElementById("mood-stats-chart");
        const insightsText = document.getElementById("mood-insights-text");
        if (!statsChart || !insightsText) return;

        if (entries.length === 0) {
            statsChart.innerHTML = `
                <div class="empty-journal">
                    <p style="font-size:0.85rem; color:var(--text-muted);">No statistics available yet.</p>
                </div>
            `;
            insightsText.innerText = "Start analyzing your moods to generate statistics and mental health insights.";
            return;
        }

        const counts = { happy: 0, sad: 0, motivated: 0, calm: 0, energetic: 0 };
        entries.forEach(e => {
            if (counts[e.mood] !== undefined) {
                counts[e.mood]++;
            }
        });

        const total = entries.length;
        const moodOrder = ["happy", "sad", "motivated", "calm", "energetic"];
        const moodEmojis = { happy: "😊", sad: "😢", motivated: "🔥", calm: "🍃", energetic: "⚡" };

        statsChart.innerHTML = moodOrder.map(mood => {
            const count = counts[mood];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const emoji = moodEmojis[mood];
            return `
                <div class="stat-row">
                    <span class="stat-label">${emoji} ${mood}</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill bar-${mood}" style="width: ${pct}%;"></div>
                    </div>
                    <span class="stat-percent">${pct}%</span>
                </div>
            `;
        }).join('');

        // Find dominant mood
        let maxCount = -1;
        let dominantMood = "";
        moodOrder.forEach(mood => {
            if (counts[mood] > maxCount) {
                maxCount = counts[mood];
                dominantMood = mood;
            }
        });

        // Dynamic insights based on dominant mood
        const moodInsights = {
            happy: "Your journal shows high levels of happiness recently! Keep riding this wave of positivity and spreading joy to those around you.",
            sad: "You've been logging some sad moments lately. Remember to be gentle with yourself, take restful breaks, and let these ambient soundscapes help you process.",
            calm: "You have been maintaining a very peaceful and serene state of mind. Excellent job keeping stress levels low and staying grounded.",
            motivated: "You are feeling highly driven and goal-oriented right now! Direct this fire into your current projects, but don't forget to take minor breathers.",
            energetic: "You're full of dynamic, positive energy! Use this excitement to create, express yourself, or engage in active workouts."
        };

        if (maxCount > 0) {
            insightsText.innerText = moodInsights[dominantMood] || "Keep journaling to refine your custom mental health profile.";
        } else {
            insightsText.innerText = "Start analyzing your moods to generate statistics and mental health insights.";
        }
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Set up clear button
    const clearBtn = document.getElementById("clear-journal-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear your mood journal history?")) {
                localStorage.setItem(journalKey, "[]");
                renderJournal();
            }
        });
    }

    // Initial render
    renderJournal();


    // ----------------------------------------------------
    // 2. Procedural Audio Synthesizer (Web Audio API)
    // ----------------------------------------------------
    let audioCtx = null;
    let masterGain = null;
    let analyser = null;
    let isPlaying = false;
    let synthIntervals = [];
    let activeNodes = [];
    let currentMood = document.body.getAttribute("data-mood") || "default";

    // Dynamic customization parameters
    let currentWaveform = "sine";
    let currentBpm = 120;
    let currentCutoff = 600;

    // Track running oscillators/filters to push live tweaks
    let runningOscillators = [];
    let runningFilters = [];
    let activeIntervalCallback = null;

    const playBtn = document.getElementById("synth-play-btn");
    const volumeSlider = document.getElementById("synth-volume");

    // Synth Settings Panel selectors
    const waveformSelect = document.getElementById("synth-waveform");
    const bpmSlider = document.getElementById("synth-bpm");
    const bpmVal = document.getElementById("bpm-val");
    const cutoffSlider = document.getElementById("synth-cutoff");
    const cutoffVal = document.getElementById("cutoff-val");
    const settingsToggle = document.getElementById("synth-settings-toggle");
    const settingsPanel = document.getElementById("synth-settings-panel");

    // Accordion Toggle
    if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener("click", () => {
            const chevron = settingsToggle.querySelector(".toggle-chevron");
            settingsPanel.classList.toggle("open");
            if (chevron) {
                chevron.classList.toggle("open");
            }
        });
    }

    // Initialize custom slider default values on page load
    if (waveformSelect) currentWaveform = waveformSelect.value;
    if (bpmSlider && bpmVal) {
        currentBpm = parseInt(bpmSlider.value);
        bpmVal.innerText = currentBpm;
    }
    if (cutoffSlider && cutoffVal) {
        currentCutoff = parseInt(cutoffSlider.value);
        cutoffVal.innerText = currentCutoff;
    }

    // Sync Slider changes
    if (waveformSelect) {
        waveformSelect.addEventListener("change", (e) => {
            currentWaveform = e.target.value;
            updateOscillatorsWaveform();
        });
    }
    if (bpmSlider && bpmVal) {
        bpmSlider.addEventListener("input", (e) => {
            currentBpm = parseInt(e.target.value);
            bpmVal.innerText = currentBpm;
            updateSynthTempo();
        });
    }
    if (cutoffSlider && cutoffVal) {
        cutoffSlider.addEventListener("input", (e) => {
            currentCutoff = parseInt(e.target.value);
            cutoffVal.innerText = currentCutoff;
            updateFilterCutoff();
        });
    }

    // Playback Listeners
    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (!isPlaying) {
                startAudio();
            } else {
                stopAudio();
            }
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener("input", (e) => {
            const vol = parseFloat(e.target.value);
            if (masterGain && audioCtx) {
                masterGain.gain.setValueAtTime(vol, audioCtx.currentTime);
            }
        });
    }

    function initAudio() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(volumeSlider ? parseFloat(volumeSlider.value) : 0.5, audioCtx.currentTime);
        
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        masterGain.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

    function startAudio() {
        try {
            initAudio();
            isPlaying = true;
            playBtn.innerHTML = `<i class="fa-solid fa-square"></i> Stop Soundscape`;
            playBtn.classList.add("playing");

            // Direct generators based on mood
            if (currentMood === "calm") {
                startCalmDrone();
            } else if (currentMood === "happy") {
                startHappyChimes();
            } else if (currentMood === "sad") {
                startSadPiano();
            } else if (currentMood === "motivated") {
                startMotivatedBeats();
            } else if (currentMood === "energetic") {
                startEnergeticArps();
            } else {
                startCalmDrone();
            }
        } catch (e) {
            console.error("Failed to initialize Web Audio:", e);
            alert("Could not start audio engine. Please check your browser audio permission settings.");
        }
    }

    function stopAudio() {
        isPlaying = false;
        playBtn.innerHTML = `<i class="fa-solid fa-play"></i> Play Soundscape`;
        playBtn.classList.remove("playing");

        // Clear intervals
        synthIntervals.forEach(clearInterval);
        synthIntervals = [];
        activeIntervalCallback = null;

        // Stop direct nodes
        activeNodes.forEach(node => {
            try {
                node.stop();
            } catch (e) {}
        });
        activeNodes = [];
        runningOscillators = [];
        runningFilters = [];

        // Close context
        if (audioCtx) {
            audioCtx.close().then(() => {
                audioCtx = null;
                masterGain = null;
                analyser = null;
            });
        }
    }

    // Live binding update sweeps
    function updateOscillatorsWaveform() {
        runningOscillators.forEach(osc => {
            try {
                osc.type = currentWaveform;
            } catch(e) {}
        });
    }

    function updateFilterCutoff() {
        runningFilters.forEach(filter => {
            try {
                filter.frequency.setValueAtTime(currentCutoff, audioCtx.currentTime);
            } catch(e) {}
        });
    }

    function startSequencerInterval(callback, duration) {
        // Clear existing intervals
        synthIntervals.forEach(clearInterval);
        synthIntervals = [];

        activeIntervalCallback = callback;

        const interval = setInterval(callback, duration);
        synthIntervals.push(interval);
        callback(); // Initial trigger
    }

    function updateSynthTempo() {
        if (!isPlaying || !activeIntervalCallback) return;
        
        let duration = 450;
        if (currentMood === "happy") {
            duration = (60 / currentBpm) * 900;
        } else if (currentMood === "sad") {
            duration = (60 / currentBpm) * 4000;
        } else if (currentMood === "motivated") {
            duration = (60 / currentBpm) * 560;
        } else if (currentMood === "energetic") {
            duration = (60 / currentBpm) * 260;
        } else {
            return; // Calm drone doesn't use sequencer intervals
        }

        startSequencerInterval(activeIntervalCallback, duration);
    }

    // --- Audio Generators ---
    
    // 1. Calm: Deep drone + waves noise modulation
    function startCalmDrone() {
        if (!audioCtx) return;

        // White Noise Buffer for ocean waves
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = "lowpass";
        noiseFilter.frequency.setValueAtTime(currentCutoff, audioCtx.currentTime);
        runningFilters.push(noiseFilter);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseNode.start();
        activeNodes.push(noiseNode);

        // LFO for wave swelling
        const waveLfo = audioCtx.createOscillator();
        waveLfo.type = "sine";
        waveLfo.frequency.setValueAtTime(0.07, audioCtx.currentTime); // 14s cycle

        const waveLfoGain = audioCtx.createGain();
        waveLfoGain.gain.setValueAtTime(0.03, audioCtx.currentTime);

        waveLfo.connect(waveLfoGain);
        waveLfoGain.connect(noiseGain.gain);
        waveLfo.start();
        activeNodes.push(waveLfo);

        // Ambient chord
        const chordFreqs = [87.31, 130.81, 174.61, 220.00, 261.63];
        chordFreqs.forEach(freq => {
            const osc = audioCtx.createOscillator();
            osc.type = currentWaveform;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            runningOscillators.push(osc);

            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.015, audioCtx.currentTime);

            // Small slow modulation
            const driftLfo = audioCtx.createOscillator();
            driftLfo.frequency.setValueAtTime(0.05 + Math.random() * 0.05, audioCtx.currentTime);
            const driftLfoGain = audioCtx.createGain();
            driftLfoGain.gain.setValueAtTime(0.008, audioCtx.currentTime);

            driftLfo.connect(driftLfoGain);
            driftLfoGain.connect(gainNode.gain);

            osc.connect(gainNode);
            gainNode.connect(masterGain);

            driftLfo.start();
            osc.start();

            activeNodes.push(driftLfo);
            activeNodes.push(osc);
        });
    }

    // 2. Happy: Bright pentatonic chimes
    function startHappyChimes() {
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; // C Major Pentatonic
        
        function triggerChime() {
            if (!audioCtx || !isPlaying) return;
            const freq = scale[Math.floor(Math.random() * scale.length)];
            
            const osc = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gainNode = audioCtx.createGain();

            osc.type = currentWaveform;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            osc2.type = currentWaveform;
            osc2.frequency.setValueAtTime(freq * 2, audioCtx.currentTime);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(currentCutoff, audioCtx.currentTime);

            gainNode.gain.setValueAtTime(0.07, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.6);

            osc.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);

            osc.start();
            osc2.start();
            
            osc.stop(audioCtx.currentTime + 1.7);
            osc2.stop(audioCtx.currentTime + 1.7);
        }

        const duration = (60 / currentBpm) * 900;
        startSequencerInterval(triggerChime, duration);
    }

    // 3. Sad: Melancholic piano chords
    function startSadPiano() {
        const baseNotes = [110.00, 130.81, 146.83, 164.81]; // A2, C3, D3, E3 (minor/dark)
        const melodyNotes = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00]; // A3, C4, D4, E4, G4, A4

        function triggerSadSequence() {
            if (!audioCtx || !isPlaying) return;
            
            const base = baseNotes[Math.floor(Math.random() * baseNotes.length)];
            const mel = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];

            playPluckNode(base, 0.05, 3.5, currentWaveform, currentCutoff);
            
            setTimeout(() => {
                if (isPlaying && audioCtx) {
                    playPluckNode(mel, 0.035, 2.5, currentWaveform, currentCutoff * 1.5);
                }
            }, 400);
        }

        function playPluckNode(freq, vol, duration, type, filterCutoff) {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(filterCutoff, audioCtx.currentTime);

            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start();
            osc.stop(audioCtx.currentTime + duration + 0.1);
        }

        const duration = (60 / currentBpm) * 4000;
        startSequencerInterval(triggerSadSequence, duration);
    }

    // 4. Motivated: Driving bassline
    function startMotivatedBeats() {
        let step = 0;
        const pattern = [
            110.00, 110.00, 110.00, 130.81,
            98.00, 98.00, 87.31, 87.31
        ];

        function triggerStep() {
            if (!audioCtx || !isPlaying) return;

            const freq = pattern[step % pattern.length];
            const osc = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();

            osc.type = currentWaveform;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(currentCutoff, audioCtx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(currentCutoff * 0.3, audioCtx.currentTime + 0.18);

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);

            if (step % 4 === 0) {
                const melFreqs = [440.00, 523.25, 659.25];
                const mel = melFreqs[Math.floor(Math.random() * melFreqs.length)];

                const oscMel = audioCtx.createOscillator();
                const gainMel = audioCtx.createGain();

                oscMel.type = currentWaveform;
                oscMel.frequency.setValueAtTime(mel, audioCtx.currentTime);

                gainMel.gain.setValueAtTime(0.02, audioCtx.currentTime);
                gainMel.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

                oscMel.connect(gainMel);
                gainMel.connect(masterGain);

                oscMel.start();
                oscMel.stop(audioCtx.currentTime + 0.6);
            }

            step++;
        }

        const duration = (60 / currentBpm) * 560;
        startSequencerInterval(triggerStep, duration);
    }

    // 5. Energetic: Fast electronic arpeggiator
    function startEnergeticArps() {
        let step = 0;
        const arpScale = [196.00, 220.00, 261.63, 329.63, 392.00, 440.00, 523.25, 659.25];
        const patterns = [
            [1, 3, 5, 7, 6, 4, 2, 0],
            [0, 2, 4, 6, 7, 5, 3, 1],
            [0, 4, 2, 6, 1, 5, 3, 7]
        ];
        
        let patternIdx = 0;

        function triggerArp() {
            if (!audioCtx || !isPlaying) return;

            const selectedPattern = patterns[patternIdx % patterns.length];
            const scaleIdx = selectedPattern[step % selectedPattern.length];
            const freq = arpScale[scaleIdx];

            const osc = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();

            osc.type = currentWaveform;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = "bandpass";
            const sweep = currentCutoff + 400 * Math.sin(audioCtx.currentTime * 2.5);
            filter.frequency.setValueAtTime(sweep, audioCtx.currentTime);
            filter.Q.setValueAtTime(3.0, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.025, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.14);

            step++;
            if (step % 16 === 0) {
                patternIdx++;
            }
        }

        const duration = (60 / currentBpm) * 260;
        startSequencerInterval(triggerArp, duration);
    }


    // ----------------------------------------------------
    // 3. HTML5 Canvas Visualizer
    // ----------------------------------------------------
    const canvas = document.getElementById("visualizer-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        // Particle System
        class Particle {
            constructor() {
                this.reset();
                this.y = Math.random() * canvas.height;
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.size = Math.random() * 5 + 1.5;
                this.alpha = Math.random() * 0.4 + 0.1;
                this.life = 1;

                if (currentMood === "sad") {
                    this.y = -10;
                    this.speedY = Math.random() * 2.5 + 2.0;
                    this.speedX = -0.5;
                    this.hue = 210 + Math.random() * 15;
                } else if (currentMood === "happy") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 1.5 + 0.8);
                    this.speedX = Math.random() * 0.8 - 0.4;
                    this.hue = 42 + Math.random() * 10;
                } else if (currentMood === "motivated") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 2.5 + 1.2);
                    this.speedX = Math.random() * 1.6 - 0.8;
                    this.hue = 0 + Math.random() * 15;
                } else if (currentMood === "calm") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 0.5 + 0.2);
                    this.speedX = Math.random() * 0.4 - 0.2;
                    this.hue = 155 + Math.random() * 20;
                } else if (currentMood === "energetic") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 3.5 + 2.0);
                    this.speedX = Math.random() * 3.0 - 1.5;
                    this.hue = 325 + Math.random() * 20;
                } else {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 1.0 + 0.4);
                    this.speedX = Math.random() * 0.6 - 0.3;
                    this.hue = 262 + Math.random() * 20;
                }
            }

            update(energy) {
                const velocityBoost = 1 + energy * 2.5;
                this.y += this.speedY * velocityBoost;
                this.x += this.speedX;

                if (this.x < -20) this.x = canvas.width + 20;
                if (this.x > canvas.width + 20) this.x = -20;

                if (currentMood === "sad") {
                    if (this.y > canvas.height + 10) this.reset();
                } else {
                    if (this.y < -10) this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = `hsl(${this.hue}, 85%, 65%)`;
                ctx.shadowBlur = this.size * 1.8;
                ctx.shadowColor = `hsl(${this.hue}, 85%, 55%)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        const particleCount = 50;
        const particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function getMoodHexColor(mood) {
            switch(mood) {
                case "happy": return "#fbbf24";
                case "sad": return "#60a5fa";
                case "motivated": return "#f87171";
                case "calm": return "#34d399";
                case "energetic": return "#f472b6";
                default: return "#a78bfa";
            }
        }

        function animate() {
            requestAnimationFrame(animate);

            let energy = 0;
            let dataArray = null;

            if (isPlaying && analyser) {
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                energy = (sum / bufferLength) / 255;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.update(energy);
                p.draw();
            });

            if (isPlaying && dataArray) {
                ctx.save();
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = getMoodHexColor(currentMood);
                ctx.shadowBlur = 20;
                ctx.shadowColor = getMoodHexColor(currentMood);
                ctx.beginPath();

                const sliceWidth = canvas.width / dataArray.length;
                let x = 0;

                for (let i = 0; i < dataArray.length; i++) {
                    const value = dataArray[i] / 255;
                    const offset = value * 150;
                    const y = (canvas.height / 2) + Math.sin(i * 0.12 + Date.now() * 0.005) * offset;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.save();
                ctx.lineWidth = 2.0;
                ctx.strokeStyle = getMoodHexColor(currentMood);
                ctx.globalAlpha = 0.2;
                ctx.beginPath();

                const sliceWidth = canvas.width / 80;
                let x = 0;
                for (let i = 0; i <= 80; i++) {
                    const y = (canvas.height / 2) + Math.sin(i * 0.08 + Date.now() * 0.001) * 25;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        animate();
    }


    // ----------------------------------------------------
    // 4. Guided Breathing Exercise (Calm & Sad States)
    // ----------------------------------------------------
    const breathCircle = document.getElementById("breath-circle");
    const breathText = document.getElementById("breath-text");
    
    if (breathCircle && breathText) {
        // Trigger breathing circle animation
        breathCircle.classList.add("active");
        
        function runBreathingSequence() {
            if (!breathText) return;
            breathText.innerText = "Inhale";
            
            setTimeout(() => {
                if (breathText) breathText.innerText = "Hold";
            }, 4000);
            
            setTimeout(() => {
                if (breathText) breathText.innerText = "Exhale";
            }, 6000);
        }
        
        // Loop breathing prompts
        runBreathingSequence();
        const breathingInterval = setInterval(runBreathingSequence, 10000); // 10s cycle matches CSS keyframe breatheAnim
    }
});