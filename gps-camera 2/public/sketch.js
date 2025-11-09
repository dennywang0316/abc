let mappa = new Mappa('Leaflet'); // map library
let myMap;
let canvas;
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
  me = new MyPoint();
  socket.emit("new-user", me.col.levels)
  socket.on("users-update", data => {
  for (let id in data) {
    if (!others[id]) {
      others[id] = new MyPoint();
    }
    others[id].col = color(data[id].color); 
  }
}); 
    


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


    //camera logos
    for (let i = 0; i < camerasLocation.length; i++) {

      let c = camerasLocation[i];
      let d = getDistanceFromLatLonInM(me.lat, me.lng, c.lat, c.lng);
      // cameras.push({ lat: c.lat, lng: c.lng });
      let camPos = myMap.latLngToPixel(c.lat, c.lng);


      stroke(0);
      fill(150, 7, 7);
      curve(camPos.x - 5, camPos.y - 60, camPos.x - 12, camPos.y, camPos.x + 12, camPos.y, camPos.x + 5, camPos.y - 50);
      curve(camPos.x - 5, camPos.y + 60, camPos.x - 12, camPos.y, camPos.x + 12, camPos.y, camPos.x + 5, camPos.y + 50);
      // function PupilMove() {
      // }
      let camVector = createVector(camPos.x, camPos.y);
      let targetVector = createVector(me.x, me.y);
      let moveeye = p5.Vector.sub(targetVector, camVector);
      moveeye.limit(2.5);
      push();
      let pupilX = moveeye.x;
      let pupilY = moveeye.y;
      fill(0);
      noStroke();
      if (d < 30) {
        translate(camPos.x, camPos.y);
        circle(pupilX, pupilY, 10);
        fill(180);
        circle(pupilX + 1, pupilY + 1, 3);
      } else {
        circle(camPos.x, camPos.y, 11);
        fill(30);
        circle(camPos.x, camPos.y, 5);
      }

      pop();

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
        stroke(170, 240, 255, 150);
        strokeWeight(1);
        if (me.x < c.x) {
          line(me.x, me.y, c.x-12, c.y);
        } else {
          line(me.x, me.y, c.x+12, c.y);
        }
        //number of cameras in each loop
        numCameras++;
      }

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

    textSize(40)
    text(numCameras, 200, 50)

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

    drawAllTraces(traces);
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

function drawtraces(traces) {

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
  stroke(170, 240, 255, traceTran);
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

//directly called from GPS listener whenever our location updates;
function handleNewPosition(pos) {
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
  constructor() {
    this.x = 0;
    this.y = 0;
    this.goalX = 0;
    this.goalY = 0;
    this.size = 14;
    this.colorArray = [
    color(252, 252, 78),
    color(255, 164, 84),
    color(158, 255, 84),
    color(170, 240, 255),
    color(255, 153, 153),
    color(84, 132, 255),
    color(155, 84, 255),
    color(255, 117, 209)
  ];
    let userIdx = floor(random(this.colorArray.length));
    this.col = this.colorArray[userIdx];
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