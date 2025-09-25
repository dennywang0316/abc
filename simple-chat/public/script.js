//initialize socket connection
const socket = io();

let formeElm = document.querySelector("#chatForm");
let msgInput = document.querySelector("#newMessage");
const nameInput = document.querySelector("#nameWrapper input");
let currentName = "";

nameInput.addEventListener("input", function(e){
    currentName = (e.target.value || "").trim();
});

// SEND TO SERVER
formeElm.addEventListener("submit",newMessageSubmitted);

function newMessageSubmitted(event){
    event.preventDefault();
    let text = (msgInput.value || "").trim();
    if(!text) return;

    const name = currentName || "Anonymous";
    const msg = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        senderName: name,
        text: text,
        timestamp: Date.now()
    };
    socket.emit("message", msg);
    msgInput.value = "";
}

// LISTEN FROM SERVER
socket.on("message", function(incoming){
    let msgId = null;
    let txt = incoming;
    let nmFromPayload = null;
    if (typeof incoming === "object" && incoming !== null){
        msgId = incoming.id || null;
        const nm = incoming.senderName || "Anonymous";
        const t = incoming.text || "";
        nmFromPayload = nm;
        txt = nm + ":" + t;
    }
    appendMessage(txt, { id: msgId, senderName: nmFromPayload });
});

// system messages
socket.on("system", function(text){
    appendSystemMessage(text || "");
});

// connection diagnostics
socket.on("connect", function(){
    console.log("socket connected", socket.id);
});
socket.on("connect_error", function(err){
    console.log("socket connect_error", err && err.message);
});
socket.on("disconnect", function(reason){
    console.log("socket disconnected", reason);
});

// RENDER DOM
function appendMessage(txt, opts){
    let chatThreadList = document.querySelector("#threadWrapper ul");

    let name = opts && opts.senderName ? opts.senderName : "";
    let content = txt;
    let idx = txt.indexOf(":");
    if(idx > -1){
        if(!name){ name = txt.slice(0, idx).trim(); }
        content = txt.slice(idx+1).trim();
    }
    name = (name || "").trim();

    let newListItem = document.createElement("li");
    newListItem.className = "msg";
    if (opts && opts.id){ newListItem.dataset.id = opts.id; }

    let whoSpan = document.createElement("span");
    whoSpan.className = "who";
    whoSpan.innerText = (name || "Anonymous") + ":";
    newListItem.appendChild(whoSpan);

    let wordsSpan = document.createElement("span");
    wordsSpan.className = "words";
    wordsSpan.innerText = content;
    newListItem.appendChild(wordsSpan);

    let lower = (name || "").toLowerCase();
    if(lower === "denny"){ newListItem.classList.add("denny"); }
    else if(lower === "stacie"){ newListItem.classList.add("stacie"); }
    else { newListItem.classList.add("other"); }

    // right align if it's me (local perspective)
    if ((currentName || "Anonymous").toLowerCase() === lower){
        newListItem.classList.add("me");
    }

    if(content === "你说的对"){ newListItem.appendChild(createPixelArtThumbsUp()); }
    else if(content === "真的吗"){ newListItem.appendChild(createPixelArtQuestion()); }

    chatThreadList.append(newListItem);
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}

function appendSystemMessage(text){
    let chatThreadList = document.querySelector("#threadWrapper ul");
    let li = document.createElement("li");
    li.className = "msg system";
    let span = document.createElement("span");
    span.className = "words";
    span.innerText = text;
    li.appendChild(span);
    chatThreadList.append(li);
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}

// pixel art / meme
function createPixelArtContainer(cols){
    let wrap = document.createElement("div");
    wrap.className = "pixel-art";
    wrap.style.setProperty("--cols", cols);
    return wrap;
}

function createPixelArtThumbsUp(){
    let grid = [
        [0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,1,1,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,1,1,0,0,0,0,0],
        [0,0,0,0,0,1,1,0,0,0,0,0]
    ];
    return renderPixelGrid(grid);
}

function createPixelArtQuestion(){
    let grid = [
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [1,1,0,0,0,0,0,0,0,0,1,1],
        [1,0,0,1,1,1,1,1,1,0,0,1],
        [1,0,1,1,0,0,0,0,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,0,0,0,1,1,0,0,1,0,1],
        [1,0,0,0,1,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,0,0,0,0,0,0,0,0,1,1],
        [0,1,1,1,1,0,0,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0]
    ];
    return renderPixelGrid(grid);
}

function renderPixelGrid(grid){
    let cols = grid[0].length;
    let wrap = createPixelArtContainer(cols);
    for(let r = 0; r < grid.length; r++){
        for(let c = 0; c < cols; c++){
            let cell = document.createElement("div");
            cell.className = "px" + (grid[r][c] ? " on" : "");
            wrap.appendChild(cell);
        }
    }
    return wrap;
}

// join announce when name set
let joinAnnounced = false;
function announceJoinIfReady(){
    if (!joinAnnounced && currentName){
        socket.emit("user:join", currentName);
        joinAnnounced = true;
    }
}
nameInput.addEventListener("change", announceJoinIfReady);
socket.on("connect", announceJoinIfReady);

// long-press font cycling (synced)
const fontFamilies = [
    'ui-sans-serif, system-ui',
    'Courier New, monospace',
    'Georgia, serif',
    'Comic Sans MS, cursive',
    'Menlo, Monaco, monospace'
];
let msgIdToTimer = {};

function startFontCycleFor(li){
    const words = li.querySelector('.words');
    if(!words) return;
    let i = 0;
    stopFontCycleFor(li); // ensure clean
    msgIdToTimer[li.dataset.id] = setInterval(function(){
        i = (i + 1) % fontFamilies.length;
        words.style.fontFamily = fontFamilies[i];
    }, 200);
}
function stopFontCycleFor(li){
    const id = li && li.dataset ? li.dataset.id : null;
    if(id && msgIdToTimer[id]){
        clearInterval(msgIdToTimer[id]);
        delete msgIdToTimer[id];
    }
}

// delegate click events to toggle font cycle
const thread = document.querySelector('#threadWrapper ul');
thread.addEventListener('click', function(e){
    const li = e.target.closest('li.msg');
    if(!li || !li.dataset.id) return;
    const isRunning = !!msgIdToTimer[li.dataset.id];
    if(isRunning){
        stopFontCycleFor(li);
        socket.emit('font:stop', { msgId: li.dataset.id });
    }else{
        startFontCycleFor(li);
        socket.emit('font:start', { msgId: li.dataset.id });
    }
});

// sync handlers
socket.on('font:start', function(payload){
    const id = payload && payload.msgId;
    if(!id) return;
    const li = document.querySelector(`li.msg[data-id="${id}"]`);
    if(li) startFontCycleFor(li);
});
socket.on('font:stop', function(payload){
    const id = payload && payload.msgId;
    if(!id) return;
    const li = document.querySelector(`li.msg[data-id="${id}"]`);
    if(li) stopFontCycleFor(li);
});
