let formeElm = document.querySelector("#chatForm");
console.log(formeElm);
let msgInput = document.querySelector("#newMessage");
console.log(msgInput);


// LISTEN FOR NEWLY TYPES MESSAGES, 
// SEND THEM TO THE SERVER
formeElm.addEventListener("submit",newMessageSubmitted);

function newMessageSubmitted(event){
    console.log(event);
    event.preventDefault();
    let newMsg = msgInput.value
    console.log(newMsg);
    
    appendMessage(newMsg);

    //clear out input:
    msgInput.value = "";
}

// LISTEN FOR NEW MESSAGES FROM SERVER
// APPEND THEM TO THE MESSAGE BOX
// AUTO SCROLL TO BOTTOM

// APPEND MESSAGES TO BOX
function appendMessage(txt){
    console.log(txt)
    //select list first (li)

    let chatThreadList = document.querySelector("#threadWrapper ul");
    console.log(chatThreadList)

    //create new list item
    let newListItem = document.createElement("li");
    newListItem.innerText = txt;
    //append new li to the list
    chatThreadList.append(newListItem);

    //scroll to bottom of textbox:
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}


appendMessage("heyyyaaaa");
appendMessage("aaaa");
// OPTIONAL: LISTEN FOR NEW NAME
// SEND IT TO SERVER
