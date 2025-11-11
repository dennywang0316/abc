let mappa = new Mappa('Leaflet'); // map library
let myMap;
let canvas;
let downloadButton;
let downloadLink;
let previewOverlay;
let previewImage;
let previewClose;
let currentLongitude = 0; // global variables will be updated as we get GPS data
let currentLatitude = 0; // global variables will be updated as we get GPS data
let othersPosOnCanvas;
let mapInit = false; // we only do map stuff once mapInit is true (see in draw)
let me; // point object showing our own location
let others = {};
// let traces = [];
let traces = [[]];
let amSurveilled = false;
let othersTraces = {};

let noise;

if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
  socket = io({ path: "/denny/port-4280/socket.io" });  // yields '/leon/port-4100/socket.io' or '/socket.io'
} else {
  socket = io();
}

// let cameras = [];
let camerasLocation = [];
let camerasCenter = [];
let traceTran;



// options for map
// we only actually initialize the map once we get data where we are (in draw)
// there are differnt suppliers and styles of maps available
let mappa_options = {
  lat: 0, // will change once we have data
  lng: 0, // will change once we have data
  zoom: 16, // initial zoom level
  // style: "https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
  // style: "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
  style: 'https://webst01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=6&x={x}&y={y}&z={z}',
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  downloadButton = document.getElementById("downloadTraceButton");
  downloadLink = document.getElementById("traceDownloadLink");
  previewOverlay = document.getElementById("tracePreviewOverlay");
  previewImage = document.getElementById("tracePreviewImage");
  previewClose = document.getElementById("tracePreviewClose");
  if (downloadButton) {
    downloadButton.addEventListener("click", handleTraceDownload);
  }
  if (previewClose) {
    previewClose.addEventListener("click", hideTracePreview);
  }
  if (previewOverlay) {
    previewOverlay.addEventListener("click", (event) => {
      if (event.target === previewOverlay) {
        hideTracePreview();
      }
    });
  }

  noise = new p5.Noise('white');
  noise.amp(0);
  noise.start();

  me = new MyPoint(color(170, 240, 255));

  //   socket.emit("new-user", me.col.levels)
  //   socket.on("users-update", data => {
  //   for (let id in data) {
  //     if (!others[id]) {
  //       others[id] = new MyPoint(color(200));
  //     }
  //     // others[id].col = color(data[id].color); 
  //   }
  // }); 



  //load the json file
  loadJSON('camera-location.json', function (data) {
    camerasLocation = data;
    // console.log("Loaded cameras:", camerasLocation);
    //for drawing lines
    camerasCenter = data;
  });

}

function draw() {
  clear();


  // // Initialize full screen map
  if (!mapInit && GPS_GRANTED && currentLongitude != 0) {
    console.log("starting map");
    mappa_options.lat = currentLatitude;
    mappa_options.lng = currentLongitude;
    // mappa_options.lat = 31.798695;
    // mappa_options.lng = 119.900453;
    myMap = mappa.tileMap(mappa_options);
    myMap.overlay(canvas);
    myMap.onChange(updateMapContent);
    // unlockButton.style.display = "block";
    // deleteButton.style.display = "block";
    mapInit = true
    if (downloadButton) {
      downloadButton.style.display = "block";
    }
  }

  if (mapInit) {

    //camera centers (for drawing lines)
    for (let i = 0; i < camerasCenter.length; i++) {
      let c = camerasCenter[i];
      // cameras.push({ lat: c.lat, lng: c.lng });
      let camPos = myMap.latLngToPixel(c.lat, c.lng);
      fill(255);
      noStroke();
      circle(camPos.x, camPos.y, 4);

    }

    //numCameras is set to 0 in every loop
    let numCameras = 0;

    //lines
    for (let i = 0; i < camerasCenter.length; i++) {
      let c = camerasCenter[i];
      let d = getDistanceFromLatLonInM(me.lat, me.lng, c.lat, c.lng);

      // let camPos = myMap.latLngToPixel(c.lat, c.lng);
      fill(255);
      //text(round(d), camPos.x, camPos.y);
      if (d < 30) {
        stroke(150, 7, 7);
        strokeWeight(1.5);
        if (me.x < c.x) {
          line(me.x, me.y, c.x - 12, c.y);
        } else {
          line(me.x, me.y, c.x + 12, c.y);
        }
        //number of cameras in each loop
        numCameras++;
      }

    }

    let volume = map(numCameras, 0, 5, 0, 1, true); 
    noise.amp(volume, 0.2); 

    //camera logos
    for (let i = 0; i < camerasLocation.length; i++) {

      let c = camerasLocation[i];
      let d = getDistanceFromLatLonInM(me.lat, me.lng, c.lat, c.lng);
      // cameras.push({ lat: c.lat, lng: c.lng });
      let camPos = myMap.latLngToPixel(c.lat, c.lng);


      let camVector = createVector(camPos.x, camPos.y);
      let targetVector = createVector(me.x, me.y);
      let moveeye = p5.Vector.sub(targetVector, camVector);
      moveeye.limit(2.5);
      push();
      let pupilX = moveeye.x;
      let pupilY = moveeye.y;
      //d<30: eyes looking towards the user
      if (d < 30) {
        stroke(0);
        fill(150, 7, 7);
        curve(camPos.x - 5, camPos.y - 60, camPos.x - 12, camPos.y, camPos.x + 12, camPos.y, camPos.x + 5, camPos.y - 50);
        curve(camPos.x - 5, camPos.y + 60, camPos.x - 12, camPos.y, camPos.x + 12, camPos.y, camPos.x + 5, camPos.y + 50);
        fill(0);
        noStroke();
        translate(camPos.x, camPos.y);
        circle(pupilX, pupilY, 10);
        fill(180);
        circle(pupilX + 1, pupilY + 1, 3);
      } else {
        //eyes turn gray
        stroke(100, 7, 7);
        strokeWeight(0.8);
        fill(230);
        curve(camPos.x - 5, camPos.y - 60, camPos.x - 12, camPos.y, camPos.x + 12, camPos.y, camPos.x + 5, camPos.y - 50);
        curve(camPos.x - 5, camPos.y + 60, camPos.x - 12, camPos.y, camPos.x + 12, camPos.y, camPos.x + 5, camPos.y + 50);
        fill(0);
        noStroke();
        circle(camPos.x, camPos.y, 12.5);
        fill(50);
        circle(camPos.x, camPos.y, 5);
      }

      pop();

    }




    if (numCameras > 5) {
      if (!amSurveilled) {
        //start a new trace (add a new trace to the end of traces)
        traces.push([]);
      }

      // traces.push([me.lat, me.lng]);

      amSurveilled = true;
      // collectTraces(); // comment this out once back to GPS

    } else {

      amSurveilled = false;
    }
    //add the eye outside number
    let firstColor = 155;
    let pupilR = 50;
    let eyeSize = 100;
    firstColor = map(sin(frameCount * 0.08), -1, 1, 100, 255);
    pupilR = map(numCameras, 1, 20, 50, 150);
    eyeSize = map(numCameras, 1, 20, 100, 480);
    stroke(0);
    fill(firstColor, 7, 7);
    curve(width / 2 - 5, -30 - eyeSize, width / 2 - 80, 70, width / 2 + 80, 70, width / 2 + 5, -30 - eyeSize);
    curve(width / 2 - 5, eyeSize + 170, width / 2 - 80, 70, width / 2 + 80, 70, width / 2 + 5, eyeSize + 170);
    fill(0);
    noStroke();
    circle(width / 2, 70, pupilR);
    fill(255);
    textSize(40);

    if (numCameras < 10) {
      text(numCameras, width / 2 - 12, 83)
    } else {
      text(numCameras, width / 2 - 25, 83)
    }

    if (numCameras < 9) {
      traceTran = 120;
    } else if (numCameras < 13) {
      traceTran = 180;
    } else {
      traceTran = 255;
    }


    // let meCoords = myMap.pixelToLatLng(mouseX, mouseY);
    // me.updateLocation(meCoords.lat, meCoords.lng);


    // let melat = 
    // for (let id in others) {
    //   others[id].update();
    //   others[id].display();
    // }



    // only update and draw our point if we actually have data
    // now draw traces every loop
    // drawtraces(traces);

    me.update();
    me.display();

    drawAllTraces(traces, color(170, 240, 255, traceTran));
    // console.log(me)

  }

  for (let id in others) {
    others[id].update();
    others[id].display();
  }
  for (let id in othersTraces) {
    drawAllTraces(othersTraces[id]);
  }
}

// socket.on("camera-from-server", (data) => {
//   cameras.push({
//     lat: data.lat,
//     lng: data.lng
//   })
// })



// P5 touch events: https://p5js.org/reference/#Touch
function touchStarted() {
  // if (mapInit) {

  // } else {
  //   console.log("TOUCHED", touches);
  // }

}

function touchMoved() {
}

function touchEnded() {
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawtraces(traces, myTraceColor) {

  // lines connected:
  // for(let i = 1; i < traces.length; i++){
  //   let prev_p = traces[i-1];
  //   let p = traces[i];
  //   let prev_p_PIX = myMap.latLngToPixel(prev_p[0], prev_p[1])
  //   let p_PIX = myMap.latLngToPixel(p[0], p[1])
  //   line(prev_p_PIX.x, prev_p_PIX.y, p_PIX.x, p_PIX.y)
  // }


  //curveVertex
  if (traces.length == 0) return;
  stroke(myTraceColor || color(220, traceTran));
  beginShape();
  // control point
  let p = traces[0];
  let p_PIX = myMap.latLngToPixel(p[0], p[1])
  curveVertex(p_PIX.x, p_PIX.y);

  for (let i = 0; i < traces.length; i++) {
    p = traces[i];
    p_PIX = myMap.latLngToPixel(p[0], p[1])
    curveVertex(p_PIX.x, p_PIX.y);
  }

  // control point
  p = traces[traces.length - 1];
  p_PIX = myMap.latLngToPixel(p[0], p[1])
  noFill();
  strokeWeight(2);
  curveVertex(p_PIX.x, p_PIX.y);
  endShape();
}

function drawAllTraces(traces) {
  for (let i = 0; i < traces.length; i++) {
    drawtraces(traces[i]);
  }
}

function drawAllTracesToGraphics(gfx, traceCollection) {
  if (!traceCollection || !gfx) return;
  for (let i = 0; i < traceCollection.length; i++) {
    drawTraceToGraphics(gfx, traceCollection[i]);
  }
}

function drawTraceToGraphics(gfx, singleTrace) {
  if (!gfx || !myMap || !singleTrace || singleTrace.length === 0) return;
  gfx.stroke(170, 240, 255, traceTran);
  gfx.noFill();
  gfx.strokeWeight(2);
  gfx.beginShape();
  let p = singleTrace[0];
  let p_PIX = myMap.latLngToPixel(p[0], p[1]);
  gfx.curveVertex(p_PIX.x, p_PIX.y);
  for (let i = 0; i < singleTrace.length; i++) {
    p = singleTrace[i];
    p_PIX = myMap.latLngToPixel(p[0], p[1]);
    gfx.curveVertex(p_PIX.x, p_PIX.y);
  }
  p = singleTrace[singleTrace.length - 1];
  p_PIX = myMap.latLngToPixel(p[0], p[1]);
  gfx.curveVertex(p_PIX.x, p_PIX.y);
  gfx.endShape();
}

function handleTraceDownload() {
  if (!mapInit || !myMap) {
    window.alert("Trace can only be downloaded after GPS initializes");
    return;
  }
  const snapshotLat = currentLatitude;
  const snapshotLng = currentLongitude;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshot = createGraphics(width, height);
  snapshot.pixelDensity(pixelDensity());
  snapshot.background(0);
  snapshot.strokeCap(ROUND);
  snapshot.strokeJoin(ROUND);
  drawAllTracesToGraphics(snapshot, traces);
  for (let id in othersTraces) {
    drawAllTracesToGraphics(snapshot, othersTraces[id]);
  }
  snapshot.fill(255);
  snapshot.noStroke();
  snapshot.textFont("Helvetica");
  snapshot.textStyle(BOLD);
  snapshot.textSize(18);
  snapshot.textAlign(LEFT, BOTTOM);
  const coordsText = `${snapshotLat.toFixed(6)}, ${snapshotLng.toFixed(6)}`;
  snapshot.text(coordsText, 24, height - 24);
  triggerTraceDownload(snapshot, `surveillance-trace-${timestamp}.png`);
  snapshot.remove();
}

function triggerTraceDownload(gfx, filename) {
  const dataUrl = gfx.canvas.toDataURL("image/png");
  if (shouldUsePreviewFlow() && showTracePreview(dataUrl)) {
    return;
  }
  const linkEl = downloadLink || document.createElement("a");
  linkEl.href = dataUrl;
  linkEl.download = filename;
  if (!downloadLink) {
    document.body.appendChild(linkEl);
  }
  linkEl.click();
  if (!downloadLink) {
    document.body.removeChild(linkEl);
  }
}

function shouldUsePreviewFlow() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

function showTracePreview(dataUrl) {
  if (!previewOverlay || !previewImage) {
    return false;
  }
  previewImage.src = dataUrl;
  previewOverlay.style.display = "flex";
  return true;
}

function hideTracePreview() {
  if (!previewOverlay || !previewImage) {
    return;
  }
  previewOverlay.style.display = "none";
  previewImage.src = "";
}

//directly called from GPS listener whenever our location updates;
function handleNewPosition(pos) {
  // if(pos.coords.accuracy > 10){
  //   console.log("got position , but acuracy is ", pos.coords.accuracy, " wont map");
  //   return
  // }
  // fix location for chinese map tiles
  let lonlat = fixForChineseMap(pos);
  currentLongitude = lonlat[0];
  currentLatitude = lonlat[1];
  console.log(currentLatitude, currentLongitude);
  if (mapInit) {
    // if map already displayed, update the point
    updateMapContent();

    // to update our location using GPS (during dev we use mouse instead)
    me.updateLocation(currentLatitude, currentLongitude);
    if (amSurveilled == true) {
      // collect traces
      collectTraces();
    }
  }
  // // right now the server doesn need out location
  let locForSer = {
    lat: currentLatitude,
    lng: currentLongitude
  }
  socket.emit("location-from-client", { locForSer });
}

function collectTraces() {
  //the latest trace
  let currentTrace = traces[traces.length - 1];

  //not pushing all the time
  //traces.length == 0: collect if there's no last point
  // > 7: only push when my current location is 7m away from the last time it was pushed
  if (
    currentTrace.length == 0 ||
    getDistanceFromLatLonInM(me.lat, me.lng,
      currentTrace[currentTrace.length - 1][0],
      currentTrace[currentTrace.length - 1][1]
    ) > 7
  ) {
    //traces.push([me.lat, me.lng]);
    currentTrace.push([me.lat, me.lng]);


    // send traces to server
    socket.emit("traces-from-client", {
      id: socket.id,
      traces: traces
    })

    console.log(traces.length);
  }

}

socket.on("traces-from-server", (data) => {
  othersTraces[data.id] = data.traces;
})
// socket.on("location-from-server", function (data) {
//   console.log("other location", data);
// })

socket.on("location-from-server", function (data) {
  if (!mapInit || !myMap) return;
  console.log("other location", data);
  // let othersPosOnCanvas = myMap.latLngToPixel(data.lat, data.lng);
  // others.goalX = othersPosOnCanvas.x;
  // others.goalY = othersPosOnCanvas.y;

  // //if first sees this id - gives it a MyPoint()
  if (!others[data.id]) {
    others[data.id] = new MyPoint();
  }

  othersPosOnCanvas = myMap.latLngToPixel(data.lat, data.lng);
  others[data.id].goalX = othersPosOnCanvas.x;
  others[data.id].goalY = othersPosOnCanvas.y;
})


function updateMapContent() {
  // let myPosOnCanvas = myMap.latLngToPixel(currentLatitude, currentLongitude)
  // me.goalX = myPosOnCanvas.x;
  // me.goalY = myPosOnCanvas.y;
  me.redraw()

  //update the positions of others
  for (let id in others) {
    let other = others[id];
    let pos = myMap.latLngToPixel(other.lat, other.lng);
    other.goalX = pos.x;
    other.goalY = pos.y;
  }

  //update the camera center locations
  for (let i = 0; i < camerasCenter.length; i++) {
    let c = camerasCenter[i];
    let camPixel = myMap.latLngToPixel(c.lat, c.lng);
    c.x = camPixel.x;
    c.y = camPixel.y;
  }
}
let colorArray = [];
let col;
class MyPoint {
  constructor(col) {
    this.x = 0;
    this.y = 0;
    this.goalX = 0;
    this.goalY = 0;
    this.size = 14;
    //   this.colorArray = [
    //   // color(252, 252, 78)
    //   // color(255, 164, 84),
    //   // color(158, 255, 84),
    //   // color(170, 240, 255),
    //   // color(255, 153, 153),
    //   //color(170, 240, 255)
    //   // color(155, 84, 255),
    //   // color(255, 117, 209)
    // ];
    // let userIdx = floor(random(this.colorArray.length));
    // this.col = this.colorArray[userIdx];
    this.col = col || color(220);
    this.lat = 0;
    this.lng = 0;
  }

  updateLocation(lat, lng) {
    this.lat = lat;
    this.lng = lng;
    this.redraw()
  }
  redraw() {
    if (mapInit) {
      let myPosOnCanvas = myMap.latLngToPixel(this.lat, this.lng)
      this.goalX = myPosOnCanvas.x;
      this.goalY = myPosOnCanvas.y;
    }
  }
  update() {
    // lerp to each new location to keep things smoother
    this.x = lerp(this.x, this.goalX, 0.2)
    this.y = lerp(this.y, this.goalY, 0.2)

  }

  display() {
    push();
    translate(this.x, this.y);
    fill(this.col);
    // stroke("pink");
    noStroke();
    let dia = this.size + sin(frameCount * 0.1)
    circle(0, 0, dia);
    pop();
  }
}

//found online
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371000; // radius of the earch
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    sin(dLat / 2) * sin(dLat / 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(dLon / 2) * sin(dLon / 2);
  const c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return R * c;
}
