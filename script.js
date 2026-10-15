const boardElement = document.querySelector(".js-board");
const statusText = document.querySelector(".js-status");
const movesText = document.querySelector(".js-moves");
const bestText = document.querySelector(".js-best");
const pairsText = document.querySelector(".js-pairs");
const timeText = document.querySelector(".js-time");
const resetButton = document.querySelector(".js-reset-button");
const clearScoreButton = document.querySelector(".js-clear-score-button");
const soundButton = document.querySelector(".js-sound-button");
const soundLabel = document.querySelector(".js-sound-label");
const soundGlyph = document.querySelector(".js-sound-glyph");
const volumeSlider = document.querySelector(".js-volume");
const volumeValue = document.querySelector(".js-volume-value");
const winOverlay = document.querySelector(".js-win-overlay");
const winTitle = document.querySelector(".js-win-title");
const winCopy = document.querySelector(".js-win-copy");
const playAgainButton = document.querySelector(".js-play-again");

const emojis = ["🌟", "🚀", "🎸", "💎", "🌈", "🔥", "🧩", "🍔"];
let cardsArray = [...emojis, ...emojis];

let hasFlippedCard = false;
let lockBoard = false;
let firstCard = null;
let secondCard = null;
let moves = 0;
let matchedPairs = 0;
let seconds = 0;
let timerId = null;
let soundOn = localStorage.getItem("nebulaMatchSound") !== "off";
let volume = clampVolume(Number(localStorage.getItem("nebulaMatchVolume")));
let audioContext = null;
let masterGain = null;
let compressor = null;
let bestScore = localStorage.getItem("memoryMatchBestScore");

updateScoreDisplay();
updateSoundControls();
createBoard();

resetButton.addEventListener("click", () => {
  playTone("click");
  resetGame();
});
clearScoreButton.addEventListener("click", () => {
  playTone("click");
  clearScore();
});
soundButton.addEventListener("click", toggleSound);
volumeSlider.addEventListener("input", handleVolumeInput);
volumeSlider.addEventListener("change", () => {
  if (soundOn && volume > 0) {
    ensureAudio();
    playTone("click");
  }
});
playAgainButton.addEventListener("click", () => {
  playTone("click");
  resetGame();
});

function updateScoreDisplay() {
  movesText.textContent = String(moves);
  pairsText.textContent = `${matchedPairs}/8`;
  bestText.textContent = bestScore ? String(bestScore) : "--";
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    seconds += 1;
    timeText.textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function shuffleCards() {
  for (let i = cardsArray.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardsArray[i], cardsArray[j]] = [cardsArray[j], cardsArray[i]];
  }
}

function createBoard() {
  boardElement.innerHTML = "";
  shuffleCards();

  cardsArray.forEach((emoji) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.dataset.name = emoji;
    card.setAttribute("aria-label", "Hidden card");

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "card-front";

    const back = document.createElement("div");
    back.className = "card-back";
    back.textContent = emoji;

    inner.append(front, back);
    card.append(inner);
    card.addEventListener("click", flipCard);
    boardElement.append(card);
  });
}

function flipCard() {
  if (lockBoard || this === firstCard || this.classList.contains("matched")) {
    return;
  }

  ensureAudio();
  this.classList.add("flip");
  playTone("flip");
  startTimer();

  if (!hasFlippedCard) {
    hasFlippedCard = true;
    firstCard = this;
    return;
  }

  secondCard = this;
  moves += 1;
  updateScoreDisplay();
  checkForMatch();
}

function checkForMatch() {
  const isMatch = firstCard.dataset.name === secondCard.dataset.name;
  if (isMatch) {
    disableCards();
  } else {
    unflipCards();
  }
}

function disableCards() {
  firstCard.classList.add("matched");
  secondCard.classList.add("matched");
  firstCard.removeEventListener("click", flipCard);
  secondCard.removeEventListener("click", flipCard);
  firstCard.setAttribute("aria-label", `Matched ${firstCard.dataset.name}`);
  secondCard.setAttribute("aria-label", `Matched ${secondCard.dataset.name}`);

  matchedPairs += 1;
  updateScoreDisplay();
  setStatus("Nice match!", "#4ade80");
  playTone("match");

  if (matchedPairs === 8) {
    endGame();
  }

  resetBoardState();
}

function unflipCards() {
  lockBoard = true;
  firstCard.classList.add("shake");
  secondCard.classList.add("shake");
  setStatus("Not a pair — try again", "#fb7185");
  playTone("miss");

  setTimeout(() => {
    firstCard.classList.remove("flip", "shake");
    secondCard.classList.remove("flip", "shake");
    resetBoardState();
    setStatus("Find all eight constellations", "#f6c945");
  }, 850);
}

function resetBoardState() {
  hasFlippedCard = false;
  lockBoard = false;
  firstCard = null;
  secondCard = null;
}

function endGame() {
  stopTimer();
  const isNewBest = !bestScore || moves < Number(bestScore);

  if (isNewBest) {
    bestScore = String(moves);
    localStorage.setItem("memoryMatchBestScore", bestScore);
    updateScoreDisplay();
  }

  playTone("win");
  setStatus(isNewBest ? `New best: ${moves} moves` : `You won in ${moves} moves`, "#4ade80");
  winTitle.textContent = isNewBest ? "New best score" : "Constellation complete";
  winCopy.textContent = `${moves} moves · ${formatTime(seconds)}`;
  winOverlay.hidden = false;
  winOverlay.setAttribute("aria-hidden", "false");
}

function resetGame() {
  stopTimer();
  seconds = 0;
  timeText.textContent = "0:00";
  moves = 0;
  matchedPairs = 0;
  resetBoardState();
  winOverlay.hidden = true;
  winOverlay.setAttribute("aria-hidden", "true");
  setStatus("Find all eight constellations", "#f6c945");
  updateScoreDisplay();
  createBoard();
}

function clearScore() {
  bestScore = null;
  localStorage.removeItem("memoryMatchBestScore");
  updateScoreDisplay();
  setStatus("Best score cleared", "#5ce1ff");
}

function setStatus(message, color) {
  statusText.textContent = message;
  statusText.style.color = color;
  statusText.classList.remove("pulse");
  void statusText.offsetWidth;
  statusText.classList.add("pulse");
}

function clampVolume(value) {
  if (!Number.isFinite(value)) return 80;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isAudible() {
  return soundOn && volume > 0;
}

function toggleSound() {
  if (isAudible()) {
    soundOn = false;
  } else {
    soundOn = true;
    if (volume === 0) {
      volume = 80;
    }
  }
  persistSoundSettings();
  updateSoundControls();
  setMasterVolume();
  if (soundOn) {
    ensureAudio();
    playTone("click");
  }
}

function handleVolumeInput() {
  volume = clampVolume(Number(volumeSlider.value));
  if (volume === 0) {
    soundOn = false;
  } else if (!soundOn) {
    soundOn = true;
  }
  persistSoundSettings();
  updateSoundControls();
  setMasterVolume();
  if (soundOn) {
    ensureAudio();
  }
}

function persistSoundSettings() {
  localStorage.setItem("nebulaMatchSound", soundOn ? "on" : "off");
  localStorage.setItem("nebulaMatchVolume", String(volume));
}

function updateSoundControls() {
  const audible = isAudible();
  soundLabel.textContent = audible ? "Sound On" : "Sound Off";
  soundGlyph.textContent = audible ? "🔊" : "🔇";
  soundButton.setAttribute("aria-pressed", String(audible));
  soundButton.setAttribute("aria-label", audible ? "Mute sound" : "Unmute sound");
  volumeSlider.value = String(volume);
  volumeSlider.setAttribute("aria-valuetext", `${volume} percent`);
  volumeValue.textContent = `${volume}%`;
}

function masterLevel() {
  if (!soundOn || volume === 0) return 0;
  return Math.pow(volume / 100, 1.4) * 1.15;
}

function setMasterVolume() {
  if (!masterGain || !audioContext) return;
  masterGain.gain.setTargetAtTime(masterLevel(), audioContext.currentTime, 0.02);
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
    compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 10;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    masterGain = audioContext.createGain();
    masterGain.gain.value = masterLevel();
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
  }
  setMasterVolume();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(kind) {
  if (!soundOn || volume === 0) return;
  ensureAudio();
  if (!audioContext || !masterGain) return;

  const now = audioContext.currentTime;
  const patterns = {
    flip: [
      { freq: 660, dur: 0.12, type: "triangle", gain: 0.42 },
      { freq: 990, dur: 0.08, type: "sine", gain: 0.22, delay: 0.02 },
    ],
    click: [
      { freq: 540, dur: 0.07, type: "triangle", gain: 0.32 },
      { freq: 1080, dur: 0.05, type: "sine", gain: 0.16 },
    ],
    match: [
      { freq: 523.25, dur: 0.18, type: "triangle", gain: 0.46 },
      { freq: 659.25, dur: 0.2, type: "sine", gain: 0.38, delay: 0.09 },
      { freq: 783.99, dur: 0.24, type: "triangle", gain: 0.34, delay: 0.18 },
    ],
    miss: [
      { freq: 196, dur: 0.22, type: "triangle", gain: 0.38 },
      { freq: 147, dur: 0.28, type: "sine", gain: 0.3, delay: 0.06 },
    ],
    win: [
      { freq: 523.25, dur: 0.18, type: "triangle", gain: 0.42 },
      { freq: 659.25, dur: 0.18, type: "sine", gain: 0.4, delay: 0.12 },
      { freq: 783.99, dur: 0.22, type: "triangle", gain: 0.42, delay: 0.24 },
      { freq: 1046.5, dur: 0.36, type: "sine", gain: 0.46, delay: 0.38 },
    ],
  };

  (patterns[kind] || []).forEach((note) => {
    const start = now + (note.delay || 0);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + note.dur + 0.03);
  });
}
