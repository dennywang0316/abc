const audioModule = (() => {
  function registerAudio(src, volume) {
    const element = new Audio(src);
    element.preload = "auto";
    if (typeof volume === "number") {
      element.volume = volume;
    }
    element.addEventListener(
      "error",
      () => {
        console.warn("Audio failed to load:", src);
      },
      { once: true }
    );
    return element;
  }

  function safePlay(element, label) {
    if (!element) return;
    element.currentTime = 0;
    const playPromise = element.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((err) => {
        console.warn(label + " playback blocked:", err);
      });
    }
  }

  function ensureLoopingPlay(element, label) {
    if (!element) return;
    element.loop = true;
    if (element.paused) {
      const playPromise = element.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => {
          console.warn(label + " playback blocked:", err);
        });
      }
    }
  }

  function stopAndReset(element) {
    if (!element) return;
    element.pause();
    element.currentTime = 0;
  }

  const popSound = registerAudio("sounds/pop.mp3", 0.4);
  const bubbleNewJoinSounds = [
    registerAudio("sounds/bubble-newjoiners.mp3", 0.45),
    registerAudio("sounds/bubble-newjoiners.mp3", 0.45),
  ];
  const movingSoundSrc = "sounds/bubble-moving.mp3";
  const backgroundAudio = registerAudio("sounds/underwater_background.mp3", 0);
  let joinSoundIndex = 0;

  const BACKGROUND_VOLUME = 0.16;

  function playBackgroundAudio() {
    if (!backgroundAudio) return;
    backgroundAudio.loop = true;
    backgroundAudio.volume = BACKGROUND_VOLUME;
    const playPromise = backgroundAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((err) => {
        console.warn("underwater background playback blocked:", err);
      });
    }
  }

  function playPopSound() {
    safePlay(popSound, "bubble pop");
  }

  function playNewJoinerSound() {
    const sound = bubbleNewJoinSounds[joinSoundIndex];
    joinSoundIndex = (joinSoundIndex + 1) % bubbleNewJoinSounds.length;
    safePlay(sound, "bubble join");
  }

  const MOVEMENT_SOUND_START_SPEED = 1.4;
  const MOVEMENT_SOUND_STOP_SPEED = 0.9;
  const MOVEMENT_SOUND_FADE_MS = 500;
  const MOVEMENT_SOUND_MIN_VOLUME = 0.12;
  const MOVEMENT_SOUND_MAX_VOLUME = 0.38;
  const movementSounds = new Map();

  function computeMovementVolume(speed) {
    const span = MOVEMENT_SOUND_MAX_VOLUME - MOVEMENT_SOUND_MIN_VOLUME;
    const normalized = Math.max(
      0,
      Math.min(1, (speed - MOVEMENT_SOUND_START_SPEED) / 4)
    );
    return MOVEMENT_SOUND_MIN_VOLUME + normalized * span;
  }

  function getOrCreateMovementSound(userId, now) {
    let state = movementSounds.get(userId);
    if (state) return state;
    const element = registerAudio(movingSoundSrc, 0);
    element.loop = true;
    state = {
      audio: element,
      active: false,
      target: 0,
      lastTouched: now || performance.now(),
    };
    movementSounds.set(userId, state);
    ensureLoopingPlay(element, "bubble moving loop");
    return state;
  }

  function updateMovementSound(userId, speed, now) {
    const existing = movementSounds.get(userId);
    let active = existing ? existing.active : false;
    if (speed > MOVEMENT_SOUND_START_SPEED) {
      active = true;
    } else if (speed < MOVEMENT_SOUND_STOP_SPEED) {
      active = false;
    }

    if (!existing && !active) return;

    const state = getOrCreateMovementSound(userId, now);
    state.active = active;
    state.target = active ? computeMovementVolume(speed) : 0;
    state.lastTouched = now;
    if (active) {
      ensureLoopingPlay(state.audio, "bubble moving loop");
    }
  }

  function stepMovementSounds(now, deltaTime) {
    const attack = deltaTime / 180;
    const release = deltaTime / MOVEMENT_SOUND_FADE_MS;
    movementSounds.forEach((state, userId) => {
      const element = state.audio;
      if (!element) return;
      const rate = state.active ? attack : release;
      const target = state.target;
      const current = element.volume;
      const diff = target - current;
      if (Math.abs(diff) > 0.002) {
        element.volume = Math.min(
          1,
          Math.max(
            0,
            current + Math.sign(diff) * Math.min(Math.abs(diff), rate)
          )
        );
      } else {
        element.volume = target;
      }

      if (state.active || element.volume > 0.01) {
        ensureLoopingPlay(element, "bubble moving loop");
      } else if (now - state.lastTouched > MOVEMENT_SOUND_FADE_MS) {
        stopAndReset(element);
        movementSounds.delete(userId);
      }
    });
  }

  function clearMovementSound(userId) {
    const state = movementSounds.get(userId);
    if (!state) return;
    stopAndReset(state.audio);
    movementSounds.delete(userId);
  }

  function clearAllMovementSounds() {
    Array.from(movementSounds.keys()).forEach(clearMovementSound);
  }

  function pruneMovementSounds(activeUsers) {
    movementSounds.forEach((_, id) => {
      if (!activeUsers || !activeUsers[id]) {
        clearMovementSound(id);
      }
    });
  }

  return {
    playBackgroundAudio,
    playPopSound,
    playNewJoinerSound,
    updateMovementSound,
    stepMovementSounds,
    clearMovementSound,
    clearAllMovementSounds,
    pruneMovementSounds,
  };
})();

window.audio = audioModule;
