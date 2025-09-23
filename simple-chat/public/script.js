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
    const line = name + ":" + text;
    socket.emit("message", line);
    msgInput.value = "";
}

// LISTEN FROM SERVER
socket.on("message", function(incoming){
 
    let txt = incoming;
    if (typeof incoming === "object" && incoming !== null){
        const nm = incoming.senderName || "Anonymous";
        const t = incoming.text || "";
        txt = nm + ":" + t;
    }
    appendMessage(txt);
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
function appendMessage(txt){
    let chatThreadList = document.querySelector("#threadWrapper ul");

    let name = "";
    let content = txt;
    let idx = txt.indexOf(":");
    if(idx > -1){
        name = txt.slice(0, idx).trim();
        content = txt.slice(idx+1).trim();
    }

    let newListItem = document.createElement("li");
    newListItem.className = "msg";

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

    if(content === "你说的对"){ newListItem.appendChild(createPixelArtThumbsUp()); }
    else if(content === "真的吗"){ newListItem.appendChild(createPixelArtQuestion()); }

    chatThreadList.append(newListItem);
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
