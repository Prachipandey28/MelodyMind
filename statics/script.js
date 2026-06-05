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

    const playBtn = document.getElementById("synth-play-btn");
    const volumeSlider = document.getElementById("synth-volume");

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
                // Fallback / default
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

        // Stop direct nodes
        activeNodes.forEach(node => {
            try {
                node.stop();
            } catch (e) {}
        });
        activeNodes = [];

        // Close context
        if (audioCtx) {
            audioCtx.close().then(() => {
                audioCtx = null;
                masterGain = null;
                analyser = null;
            });
        }
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
        noiseFilter.frequency.setValueAtTime(100, audioCtx.currentTime);

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

        // Ambient chord: F2 (87.31Hz), C3 (130.81Hz), F3 (174.61Hz), A3 (220.00Hz), C4 (261.63Hz)
        const chordFreqs = [87.31, 130.81, 174.61, 220.00, 261.63];
        chordFreqs.forEach(freq => {
            const osc = audioCtx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

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
            const gainNode = audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            osc2.type = "triangle";
            osc2.frequency.setValueAtTime(freq * 2, audioCtx.currentTime); // Octave overtone

            gainNode.gain.setValueAtTime(0.07, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.6);

            osc.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(masterGain);

            osc.start();
            osc2.start();
            
            // Auto clean up individual chime oscillators
            osc.stop(audioCtx.currentTime + 1.7);
            osc2.stop(audioCtx.currentTime + 1.7);
        }

        // Trigger every 450ms
        const chimeInterval = setInterval(triggerChime, 450);
        synthIntervals.push(chimeInterval);
        triggerChime();
    }

    // 3. Sad: Melancholic piano chords
    function startSadPiano() {
        const baseNotes = [110.00, 130.81, 146.83, 164.81]; // A2, C3, D3, E3 (minor/dark)
        const melodyNotes = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00]; // A3, C4, D4, E4, G4, A4

        function triggerSadSequence() {
            if (!audioCtx || !isPlaying) return;
            
            const base = baseNotes[Math.floor(Math.random() * baseNotes.length)];
            const mel = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];

            // Play deep warm root note
            playPluckNode(base, 0.05, 3.5, "triangle", 350);
            
            // Delayed play melody chord note
            setTimeout(() => {
                if (isPlaying && audioCtx) {
                    playPluckNode(mel, 0.035, 2.5, "sine", 600);
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

        const sadInterval = setInterval(triggerSadSequence, 2000);
        synthIntervals.push(sadInterval);
        triggerSadSequence();
    }

    // 4. Motivated: Driving bassline
    function startMotivatedBeats() {
        let step = 0;
        // Bass pattern in A minor: A2 (110.00), C3 (130.81), G2 (98.00), F2 (87.31)
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

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(250, audioCtx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.18);

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);

            // Trigger accent melody beep
            if (step % 4 === 0) {
                const melFreqs = [440.00, 523.25, 659.25]; // A4, C5, E5
                const mel = melFreqs[Math.floor(Math.random() * melFreqs.length)];

                const oscMel = audioCtx.createOscillator();
                const gainMel = audioCtx.createGain();

                oscMel.type = "triangle";
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

        const interval = setInterval(triggerStep, 280); // ~107 BPM
        synthIntervals.push(interval);
        triggerStep();
    }

    // 5. Energetic: Fast electronic arpeggiator
    function startEnergeticArps() {
        let step = 0;
        // Quick arpeggiation notes
        const arpScale = [196.00, 220.00, 261.63, 329.63, 392.00, 440.00, 523.25, 659.25]; // G3, A3, C4, E4, G4, A4, C5, E5
        const patterns = [
            [1, 3, 5, 7, 6, 4, 2, 0], // Up-down
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

            osc.type = "square";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = "bandpass";
            // Sweep bandpass cutoff with an LFO-like modulation based on global clock
            const sweep = 700 + 400 * Math.sin(audioCtx.currentTime * 2.5);
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

        const interval = setInterval(triggerArp, 130); // ~115 BPM sixteenths
        synthIntervals.push(interval);
        triggerArp();
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
                this.y = Math.random() * canvas.height; // scatter initially
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.size = Math.random() * 5 + 1.5;
                this.alpha = Math.random() * 0.4 + 0.1;
                this.life = 1;

                if (currentMood === "sad") {
                    this.y = -10; // Rain starts at top
                    this.speedY = Math.random() * 2.5 + 2.0;
                    this.speedX = -0.5; // slight slant
                    this.hue = 210 + Math.random() * 15; // Cool Blues
                } else if (currentMood === "happy") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 1.5 + 0.8);
                    this.speedX = Math.random() * 0.8 - 0.4;
                    this.hue = 42 + Math.random() * 10; // Gold/Yellow
                } else if (currentMood === "motivated") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 2.5 + 1.2);
                    this.speedX = Math.random() * 1.6 - 0.8;
                    this.hue = 0 + Math.random() * 15; // Red/Crimson
                } else if (currentMood === "calm") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 0.5 + 0.2);
                    this.speedX = Math.random() * 0.4 - 0.2;
                    this.hue = 155 + Math.random() * 20; // Sage Green/Emerald
                } else if (currentMood === "energetic") {
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 3.5 + 2.0);
                    this.speedX = Math.random() * 3.0 - 1.5;
                    this.hue = 325 + Math.random() * 20; // Hot Pink/Magenta
                } else {
                    // Default / Purplish
                    this.y = canvas.height + 10;
                    this.speedY = -(Math.random() * 1.0 + 0.4);
                    this.speedX = Math.random() * 0.6 - 0.3;
                    this.hue = 262 + Math.random() * 20; // Purple/Indigo
                }
            }

            update(energy) {
                // Boost speed and size slightly with synth energy
                const velocityBoost = 1 + energy * 2.5;
                this.y += this.speedY * velocityBoost;
                this.x += this.speedX;

                // Wrap boundaries
                if (this.x < -20) this.x = canvas.width + 20;
                if (this.x > canvas.width + 20) this.x = -20;

                // Recycle offscreen
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

        // Animation Loop
        function animate() {
            requestAnimationFrame(animate);

            let energy = 0;
            let dataArray = null;

            if (isPlaying && analyser) {
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                // Average energy/amplitude calculation
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                energy = (sum / bufferLength) / 255;
            }

            // Clear frame
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update & Draw Particles
            particles.forEach(p => {
                p.update(energy);
                p.draw();
            });

            // Draw Central Audio Waves
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
                    // Draw waving frequency line
                    const offset = value * 150; // Amp scaling
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
                // Draw idle slow ambient waves in center
                ctx.save();
                ctx.lineWidth = 2.0;
                ctx.strokeStyle = getMoodHexColor(currentMood);
                ctx.globalAlpha = 0.2;
                ctx.beginPath();

                const sliceWidth = canvas.width / 80;
                let x = 0;
                for (let i = 0; i <= 80; i++) {
                    // Slow sine drift
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
});