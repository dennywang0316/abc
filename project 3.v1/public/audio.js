// simple audio manager for more impactful launches/booms
(function () {
  const cache = {};
  function play(file, volume = 0.9) {
    const key = `assets/audio/${file}`;
    let aud = cache[key];
    if (!aud) {
      aud = new Audio(key);
      cache[key] = aud;
    } else {
      aud.pause();
      aud.currentTime = 0;
    }
    aud.volume = volume;
    aud.play().catch(() => {});
  }
  function playLaunch() {
    play("missle_en_route.mp3", 0.3);
  }
  function playBoom() {
    play("bombing.mp3", 0.3);
  }

  window.audio = { playLaunch, playBoom};
})();
