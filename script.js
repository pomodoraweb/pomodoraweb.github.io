document.addEventListener('DOMContentLoaded', function() {
    // ===== ELEMENT SELECTIONS =====
    const elements = {
        // Mode toggle
        lightModeBtn: document.getElementById('light-mode-btn'),
        darkModeBtn: document.getElementById('dark-mode-btn'),
        
        // Timer elements
        timer: document.getElementById('timer'),
        timeLeft: document.getElementById('time-left'),
        currentRound: document.getElementById('current-round'),
        totalRounds: document.getElementById('total-rounds'),
        
        // Panels
        settingsPanel: document.getElementById('settings-panel'),
        timerDisplay: document.getElementById('timer-display'),
        roundInfo: document.getElementById('round-info'),
        
        // Inputs
        workTimeInput: document.getElementById('work-time'),
        breakTimeInput: document.getElementById('break-time'),
        roundsInput: document.getElementById('rounds'),
        autoStart: document.getElementById('auto-start'),
        soundOptions: document.querySelectorAll('input[name="sound"]'),
        
        // Buttons
        startBtn: document.getElementById('start-btn'),
        infiniteStartBtn: document.getElementById('infinite-start-btn'),
        stopBtn: document.getElementById('stop-btn'),
        
        // Progress
        fullProgressBar: document.getElementById('full-progress-bar'),
        
        // Audio
        soundStart: document.getElementById('sound-start'),
        soundWorkEnd: document.getElementById('sound-work-end'),
        soundBreakEnd: document.getElementById('sound-break-end'),
        soundRain: document.getElementById('sound-rain'),
        soundNight: document.getElementById('sound-night'),
        soundCafe: document.getElementById('sound-cafe'),
        soundBeach: document.getElementById('sound-beach'),
        soundForest: document.getElementById('sound-forest')
    };

    // ===== STATE MANAGEMENT =====
    const state = {
        timerInterval: null,
        isWorking: true,
        currentRound: 1,
        totalRounds: 3,
        workTime: 25 * 60,
        breakTime: 5 * 60,
        remainingTime: 25 * 60,
        isInfiniteMode: false,
        isDarkMode: false,
        currentSound: 'none',
        lastTime: performance.now(),
        totalElapsed: 0,
        fadeIntervals: {}
    };

    // ===== INITIALIZATION =====
    function init() {
        // Ses elementlerine volume özelliği ekle
        initAudioElements();
        loadSettings();
        setupEventListeners();
    }

    function initAudioElements() {
        // Tüm ses elementlerinin volume özelliğini ayarla
        const audioElements = [
            elements.soundRain,
            elements.soundNight,
            elements.soundCafe,
            elements.soundBeach,
            elements.soundForest
        ];
        
        audioElements.forEach(audio => {
            audio.volume = 1;
            audio.addEventListener('play', () => {
                // Eğer fade interval varsa temizle
                if (state.fadeIntervals[audio.id]) {
                    clearInterval(state.fadeIntervals[audio.id]);
                    delete state.fadeIntervals[audio.id];
                }
                audio.volume = 1;
            });
        });
    }

    // ===== SETTINGS MANAGEMENT =====
    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('pomodoroSettings')) || {};
        
        // Set dark/light mode
        if (savedSettings.darkMode) {
            enableDarkMode();
        } else {
            enableLightMode();
        }
        
        // Set input values
        elements.workTimeInput.value = savedSettings.workTime || 25;
        elements.breakTimeInput.value = savedSettings.breakTime || 5;
        elements.roundsInput.value = savedSettings.rounds || 3;
        elements.autoStart.checked = savedSettings.autoStart || false;
        
        // Set sound selection
        if (savedSettings.sound) {
            document.querySelector(`input[value="${savedSettings.sound}"]`).checked = true;
            state.currentSound = savedSettings.sound;
        }
    }

    function saveSettings() {
        const settings = {
            darkMode: state.isDarkMode,
            workTime: elements.workTimeInput.value,
            breakTime: elements.breakTimeInput.value,
            rounds: elements.roundsInput.value,
            sound: document.querySelector('input[name="sound"]:checked').value,
            autoStart: elements.autoStart.checked
        };
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }

    // ===== MODE MANAGEMENT =====
    function enableDarkMode() {
        document.body.classList.add('dark-mode');
        elements.lightModeBtn.classList.remove('active');
        elements.darkModeBtn.classList.add('active');
        state.isDarkMode = true;
    }

    function enableLightMode() {
        document.body.classList.remove('dark-mode');
        elements.darkModeBtn.classList.remove('active');
        elements.lightModeBtn.classList.add('active');
        state.isDarkMode = false;
    }

    // ===== TIMER FUNCTIONS =====
    function startPomodoro() {
        // Set initial values
        state.workTime = parseInt(elements.workTimeInput.value) * 60;
        state.breakTime = parseInt(elements.breakTimeInput.value) * 60;
        state.totalRounds = parseInt(elements.roundsInput.value);
        state.currentRound = 1;
        state.remainingTime = state.workTime;
        state.isWorking = true;
        state.isInfiniteMode = false;
        state.totalElapsed = 0;

        // Reset progress bar
        elements.fullProgressBar.style.width = '0%';

        // Set initial mode
        document.body.classList.add('work-mode');
        document.body.classList.remove('break-mode');

        // Update UI
        elements.settingsPanel.classList.add('hidden');
        elements.timerDisplay.classList.remove('hidden');
        elements.roundInfo.classList.remove('hidden');
        updateTimerDisplay();
        updateRoundInfo();
        
        // Play start sound
        playSound('start');
        playBackgroundSound();
        
        // Start timer
        startTimer();
        saveSettings();
    }

    function startTimer() {
        clearInterval(state.timerInterval);
        state.lastTime = performance.now();
        
        state.timerInterval = setInterval(() => {
            const now = performance.now();
            const elapsedSeconds = Math.floor((now - state.lastTime) / 1000);
            
            if (elapsedSeconds >= 1) {
                state.remainingTime -= elapsedSeconds;
                state.totalElapsed += elapsedSeconds;
                state.lastTime = now;
                
                updateTimerDisplay();
                updateProgressBar();
                
                // Son 10 saniyede fade-out başlat
                if (state.remainingTime <= 10 && state.isWorking) {
                    fadeOutBackgroundSounds();
                }
                
                if (state.remainingTime <= 0) {
                    handleTimerCompletion();
                }
            }
        }, 100);
    }

    function handleTimerCompletion() {
        clearInterval(state.timerInterval);
        
        if (state.isWorking) {
            // Çalışma periyodu bitti
            playSound('work-end');
            
            if (state.currentRound < state.totalRounds || state.isInfiniteMode) {
                // Mola başlıyor - arkaplan sesini durdur
                stopAllBackgroundSounds();
                state.isWorking = false;
                state.remainingTime = state.breakTime;
                document.body.classList.remove('work-mode');
                document.body.classList.add('break-mode');
                startTimer();
            } else {
                // Tüm turlar tamamlandı
                stopTimer();
            }
        } else {
            // Mola bitti - çalışma sesini tekrar başlat
            playSound('break-end');
            state.currentRound++;
            state.isWorking = true;
            state.remainingTime = state.workTime;
            document.body.classList.remove('break-mode');
            document.body.classList.add('work-mode');
            updateRoundInfo();
            startTimer();
            playBackgroundSound(); // Çalışma moduna geçince sesi başlat
        }
    }

    function stopTimer() {
        clearInterval(state.timerInterval);
        stopAllSounds();
        
        // Reset UI
        document.body.classList.remove('work-mode', 'break-mode');
        elements.settingsPanel.classList.remove('hidden');
        elements.timerDisplay.classList.add('hidden');
        elements.fullProgressBar.style.width = '0%';
        
        // Reset state
        state.isWorking = true;
        state.currentRound = 1;
        state.isInfiniteMode = false;
        state.totalElapsed = 0;
    }

    // ===== UI UPDATES =====
    function updateTimerDisplay() {
        const minutes = Math.floor(state.remainingTime / 60);
        const seconds = state.remainingTime % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        elements.timer.textContent = display;
        elements.timeLeft.textContent = display;
    }

    function updateRoundInfo() {
        elements.currentRound.textContent = state.currentRound;
        elements.totalRounds.textContent = state.totalRounds;
    }

    function updateProgressBar() {
        let progress;
        const totalDuration = state.isInfiniteMode ? state.workTime : 
            (state.workTime * state.totalRounds) + (state.breakTime * (state.totalRounds - 1));
        
        if (state.isWorking) {
            const workCompleted = (state.currentRound - 1) * state.workTime;
            const breakCompleted = (state.currentRound - 1) * state.breakTime;
            const currentProgress = workCompleted + breakCompleted + (state.workTime - state.remainingTime);
            progress = (currentProgress / totalDuration) * 100;
        } else {
            const workCompleted = state.currentRound * state.workTime;
            const breakCompleted = (state.currentRound - 1) * state.breakTime;
            const currentProgress = workCompleted + breakCompleted - (state.breakTime - state.remainingTime);
            progress = (currentProgress / totalDuration) * 100;
        }
        
        elements.fullProgressBar.style.width = `${Math.min(100, progress)}%`;
    }

    // ===== AUDIO FUNCTIONS =====
    function playSound(type) {
        const soundMap = {
            'start': elements.soundStart,
            'work-end': elements.soundWorkEnd,
            'break-end': elements.soundBreakEnd
        };
        
        const sound = soundMap[type];
        if (sound) {
            sound.currentTime = 0;
            sound.volume = 1;
            sound.play().catch(e => console.error("Ses çalınamadı:", e));
        }
    }

    function playBackgroundSound() {
        // Sadece çalışma modundayken ve ses seçiliyken çal
        if (!state.isWorking || state.currentSound === 'none') return;
        
        const soundMap = {
            'rain': elements.soundRain,
            'night': elements.soundNight,
            'cafe': elements.soundCafe,
            'beach': elements.soundBeach,
            'forest': elements.soundForest
        };
        
        const sound = soundMap[state.currentSound];
        if (sound) {
            // Eğer zaten çalıyorsa tekrar başlatma
            if (!sound.paused) return;
            
            sound.currentTime = 0;
            sound.volume = 1;
            sound.play().catch(e => console.error("Arkaplan sesi çalınamadı:", e));
        }
    }

    function fadeOutBackgroundSounds() {
        if (state.currentSound === 'none') return;
        
        const soundMap = {
            'rain': elements.soundRain,
            'night': elements.soundNight,
            'cafe': elements.soundCafe,
            'beach': elements.soundBeach,
            'forest': elements.soundForest
        };
        
        const sound = soundMap[state.currentSound];
        if (sound && !sound.paused) {
            fadeOutAndStop(sound);
        }
    }

    function fadeOutAndStop(sound) {
        if (!sound || state.fadeIntervals[sound.id]) return;
        
        const fadeDuration = 2000; // 2 saniyede fade-out
        const fadeSteps = 20;
        const stepTime = fadeDuration / fadeSteps;
        const initialVolume = sound.volume;
        const volumeStep = initialVolume / fadeSteps;
        
        state.fadeIntervals[sound.id] = setInterval(() => {
            if (sound.volume > volumeStep) {
                sound.volume -= volumeStep;
            } else {
                sound.volume = 0;
                clearInterval(state.fadeIntervals[sound.id]);
                delete state.fadeIntervals[sound.id];
                sound.pause();
                sound.currentTime = 0;
            }
        }, stepTime);
    }

    function stopAllBackgroundSounds() {
        // Tüm arkaplan seslerini fade-out ile durdur
        const sounds = [
            elements.soundRain,
            elements.soundNight,
            elements.soundCafe,
            elements.soundBeach,
            elements.soundForest
        ];
        
        sounds.forEach(sound => {
            if (!sound.paused) {
                fadeOutAndStop(sound);
            }
        });
    }

    function stopAllSounds() {
        stopAllBackgroundSounds();
        elements.soundStart.pause();
        elements.soundWorkEnd.pause();
        elements.soundBreakEnd.pause();
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Mode toggle
        elements.lightModeBtn.addEventListener('click', () => {
            enableLightMode();
            saveSettings();
        });
        
        elements.darkModeBtn.addEventListener('click', () => {
            enableDarkMode();
            saveSettings();
        });
        
        // Timer controls
        elements.startBtn.addEventListener('click', startPomodoro);
        elements.stopBtn.addEventListener('click', stopTimer);
        
        elements.infiniteStartBtn.addEventListener('click', function() {
            state.isInfiniteMode = true;
            state.workTime = parseInt(elements.workTimeInput.value) * 60;
            state.breakTime = parseInt(elements.breakTimeInput.value) * 60;
            state.currentRound = 1;
            state.remainingTime = state.workTime;
            state.isWorking = true;
            state.totalElapsed = 0;
            
            document.body.classList.add('work-mode');
            elements.settingsPanel.classList.add('hidden');
            elements.timerDisplay.classList.remove('hidden');
            elements.roundInfo.classList.add('hidden');
            
            updateTimerDisplay();
            playSound('start');
            playBackgroundSound();
            startTimer();
            saveSettings();
        });
        
        // Sound selection
        elements.soundOptions.forEach(option => {
            option.addEventListener('change', function() {
                state.currentSound = this.value;
                if (state.isWorking) {
                    stopAllBackgroundSounds();
                    playBackgroundSound();
                }
                saveSettings();
            });
        });

        // Sayfa görünürlüğü değişiklikleri
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            // Sayfa gizlendiğinde sesleri duraklat
            pauseAllSounds();
        } else if (state.isWorking) {
            // Sayfa tekrar görünür olduğunda ve çalışma modundaysak sesleri devam ettir
            resumeAllSounds();
        }
    }

    function pauseAllSounds() {
        // Tüm sesleri duraklat
        const sounds = [
            elements.soundRain,
            elements.soundNight,
            elements.soundCafe,
            elements.soundBeach,
            elements.soundForest,
            elements.soundStart,
            elements.soundWorkEnd,
            elements.soundBreakEnd
        ];
        
        sounds.forEach(sound => {
            if (!sound.paused) {
                sound.dataset.wasPlaying = 'true';
                sound.pause();
            }
        });
    }

    function resumeAllSounds() {
        // Sadece çalışma modunda ve arkaplan sesi seçiliyse devam ettir
        if (state.currentSound !== 'none') {
            const soundMap = {
                'rain': elements.soundRain,
                'night': elements.soundNight,
                'cafe': elements.soundCafe,
                'beach': elements.soundBeach,
                'forest': elements.soundForest
            };
            
            const sound = soundMap[state.currentSound];
            if (sound && sound.dataset.wasPlaying === 'true') {
                sound.play().catch(e => console.error("Ses devam ettirilemedi:", e));
                delete sound.dataset.wasPlaying;
            }
        }
    }

    // ===== START THE APP =====
    init();
});