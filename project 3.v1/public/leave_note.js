(function () {
  const state = {
    mode: "move",
    notes: [],
    pendingPos: null,
    mapGetter: null,
    socket: null,
    selectedColor: null,
    callbacks: {
      onEnterNoteMode: null,
      onExitNoteMode: null,
    },
  };

  let noteToolbarEl, notesListOverlayEl, notesListEl;
  let noteOverlayEl, noteLocationLabelEl, noteTextEl, noteCityEl, noteTitleEl;
  let notePaperEl, notesListContentEl;

  function init(opts) {
    state.mapGetter = opts.getMap;
    state.socket = opts.socket;
    state.callbacks.onEnterNoteMode = opts.onEnterNoteMode || null;
    state.callbacks.onExitNoteMode = opts.onExitNoteMode || null;
    noteToolbarEl = document.getElementById("noteToolbar");
    notesListOverlayEl = document.getElementById("notesListOverlay");
    notesListEl = document.getElementById("notesList");
    noteOverlayEl = document.getElementById("noteOverlay");
    notePaperEl = document.getElementById("notePaper");
    notesListContentEl = document.getElementById("notesListContent");
    noteTitleEl = document.getElementById("noteTitle");
    noteLocationLabelEl = document.getElementById("noteLocationLabel");
    noteTextEl = document.getElementById("noteText");
    noteCityEl = document.getElementById("noteCity");
    if (noteOverlayEl) {
      noteOverlayEl.addEventListener("touchstart", (e) => e.stopPropagation(), {
        passive: true,
      });
      noteOverlayEl.addEventListener("mousedown", (e) => e.stopPropagation());
    }
    if (notePaperEl) {
      notePaperEl.addEventListener("touchstart", (e) => e.stopPropagation(), {
        passive: true,
      });
      notePaperEl.addEventListener("mousedown", (e) => e.stopPropagation());
    }
    if (notesListOverlayEl) {
      notesListOverlayEl.addEventListener(
        "touchstart",
        (e) => e.stopPropagation(),
        { passive: true }
      );
      notesListOverlayEl.addEventListener("mousedown", (e) =>
        e.stopPropagation()
      );
    }
    if (notesListContentEl) {
      notesListContentEl.addEventListener(
        "touchstart",
        (e) => e.stopPropagation(),
        { passive: true }
      );
      notesListContentEl.addEventListener("mousedown", (e) =>
        e.stopPropagation()
      );
    }
  }

  function setMode(mode) {
    state.mode = mode;
    if (noteToolbarEl) {
      const moveBtn = document.getElementById("moveModeBtn");
      const noteBtn = document.getElementById("noteModeBtn");
      if (moveBtn) moveBtn.classList.toggle("active", mode === "move");
      if (noteBtn) noteBtn.classList.toggle("active", mode === "note");
    }
    const map = state.mapGetter ? state.mapGetter() : null;
    if (map && map.map) {
      if (mode === "note") {
        map.map.dragging.disable();
        map.map.scrollWheelZoom.disable();
      } else {
        map.map.dragging.enable();
        map.map.scrollWheelZoom.enable();
      }
    }
  }

  function enterNoteMode() {
    if (noteToolbarEl) noteToolbarEl.style.display = "flex";
    setMode("note");
    if (state.callbacks.onEnterNoteMode) state.callbacks.onEnterNoteMode();
  }

  function handleTouch(e) {
    if (state.mode !== "note") return false;
    const map = state.mapGetter ? state.mapGetter() : null;
    if (!map) return false;
    const tx =
      window.touches && window.touches.length > 0
        ? window.touches[0].x
        : window.mouseX;
    const ty =
      window.touches && window.touches.length > 0
        ? window.touches[0].y
        : window.mouseY;
    const pos = map.pixelToLatLng(tx, ty);
    openNoteOverlay(pos.lat, pos.lng);
    return true;
  }

  function openNoteOverlay(lat, lng, opts = {}) {
    state.pendingPos = { lat, lng };
    if (noteLocationLabelEl)
      noteLocationLabelEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    if (noteTextEl) noteTextEl.value = "";
    if (noteCityEl) noteCityEl.value = opts.city || "";
    if (noteTitleEl) noteTitleEl.textContent = opts.war ? `Leave a note for ${opts.war}` : "Leave a note";
    if (noteOverlayEl) noteOverlayEl.style.display = "flex";
  }

  function closeNoteOverlay() {
    state.pendingPos = null;
    if (noteOverlayEl) noteOverlayEl.style.display = "none";
  }

  function submitNote() {
    if (!state.pendingPos || !noteTextEl) return;
    const txt = noteTextEl.value.trim();
    const city = noteCityEl ? noteCityEl.value.trim() : "";
    if (txt.length === 0) return;
    const payload = {
      lat: state.pendingPos.lat,
      lng: state.pendingPos.lng,
      text: txt,
      city,
    };
    if (state.socket) {
      state.socket.emit("createNote", payload);
    }
    closeNoteOverlay();
    toggleNotesList(true);
  }

  function toggleNotesList(forceOpen) {
    if (!notesListOverlayEl) return;
    if (forceOpen) {
      populateNotesList();
      notesListOverlayEl.style.display = "flex";
      return;
    }
    if (
      notesListOverlayEl.style.display === "none" ||
      notesListOverlayEl.style.display === ""
    ) {
      populateNotesList();
      notesListOverlayEl.style.display = "flex";
    } else {
      notesListOverlayEl.style.display = "none";
    }
  }

  function populateNotesList() {
    if (!notesListEl) return;
    notesListEl.innerHTML = "";
    state.notes
      .slice()
      .reverse()
      .forEach((n) => {
        const div = document.createElement("div");
        div.className = "note-item";
        const coords = `${n.lat.toFixed(4)}, ${n.lng.toFixed(4)}`;
        const city = n.city && n.city.length ? ` (${n.city})` : "";
        div.innerHTML = `<strong>${coords}${city}</strong><br>${n.text || ""}`;
        notesListEl.appendChild(div);
      });
  }

  function drawNotes(map) {
    if (!map) return;
    state.notes.forEach((n) => {
      const pos = map.latLngToPixel(n.lat, n.lng);
      window.push();
      window.translate(pos.x, pos.y);
      window.noStroke();
      const col =
        n.color && typeof window.color === "function"
          ? window.color(
              n.color.r || 255,
              n.color.g || 255,
              n.color.b || 255,
              240
            )
          : window.color(255, 240);
      window.fill(col);
      window.rectMode(window.CENTER);
      window.rect(0, 0, 30, 30, 8);
      window.fill(0);
      window.textAlign(window.CENTER, window.CENTER);
      window.textSize(14);
      window.text("✎", 0, 0);
      window.pop();
    });
  }

  function onNotes(list) {
    state.notes = (list || []).map((n) => {
      if (!n.color) return n;
      return {
        ...n,
        color: {
          r: n.color.r || 255,
          g: n.color.g || 255,
          b: n.color.b || 255,
        },
      };
    });
  }

  function clearMapArtifacts() {
    if (state.callbacks.onExitNoteMode) state.callbacks.onExitNoteMode();
  }

  function isUIEvent(ev) {
    const e = ev || window.event || null;
    const target = e && e.target ? e.target : null;
    if (!target) return false;
    const uiSelectors = [
      "#noteOverlay",
      "#notesListOverlay",
      "#noteToolbar",
      "#fireButton",
      "#infoButton",
      "#clearButton",
      "#requestOrientationButton",
      "#contextOverlay",
      "#warningOverlay",
      "textarea",
      "button",
      "input",
    ];
    return uiSelectors.some((sel) => target.closest && target.closest(sel));
  }

  window.leaveNote = {
    init,
    setMode,
    enterNoteMode,
    handleTouch,
    openNoteOverlay,
    closeNoteOverlay,
    submitNote,
    toggleNotesList,
    populateNotesList,
    drawNotes,
    onNotes,
    clearMapArtifacts,
    isUIEvent,
  };
})();
