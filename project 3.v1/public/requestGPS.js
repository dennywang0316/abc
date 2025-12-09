let GPS_GRANTED = false;
let GPS_REQUESTED = false;
let GPS_options = {
  enableHighAccuracy: false,
  timeout: 5000,
  maximumAge: 0,
};
let GPS_FALLBACK_TIMER = null;

function requestGPS() {
  if (GPS_REQUESTED) {
    return;
  }
  GPS_REQUESTED = true;
  // always set a fallback so experience can start even if GPS is blocked
  if (GPS_FALLBACK_TIMER) {
    clearTimeout(GPS_FALLBACK_TIMER);
  }
  GPS_FALLBACK_TIMER = setTimeout(() => {
    if (!GPS_GRANTED || currentLongitude === 0) {
      fallbackToShanghai();
    }
  }, 2500);

  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "granted") {
      report(result.state);
      console.log("ready");
      GPS_GRANTED = true;
      if (typeof window.requestMotion === "function") {
        window.requestMotion();
      }
      navigator.geolocation.getCurrentPosition(
        handleNewPosition,
        function () {
          fallbackToShanghai();
        },
        GPS_options
      );
      navigator.geolocation.watchPosition(
        handleNewPosition,
        function (error) {
          console.log("ERRROR GPS:", error);
          fallbackToShanghai();
        },
        GPS_options
      );
    } else if (result.state === "prompt") {
      report(result.state);
      console.log("ready");
      GPS_GRANTED = true;
      if (typeof window.requestMotion === "function") {
        window.requestMotion();
      }
      navigator.geolocation.getCurrentPosition(
        handleNewPosition,
        function () {
          fallbackToShanghai();
        },
        GPS_options
      );
      navigator.geolocation.watchPosition(
        handleNewPosition,
        function (error) {
          console.log("ERRROR GPS:", error);
          fallbackToShanghai();
        },
        GPS_options
      );
    } else if (result.state === "denied") {
      report(result.state);
      fallbackToShanghai();
    }
    result.addEventListener("change", () => {
      report(result.state);
      navigator.geolocation.watchPosition(
        handleNewPosition,
        function (error) {
          console.log("ERRROR GPS:", error);
          fallbackToShanghai();
        },
        GPS_options
      );
    });
  });
}

function report(state) {
  console.log(`Permission ${state}`);
}

function fallbackToShanghai() {
  console.log("using fallback location (Shanghai)");
  GPS_GRANTED = true;
  GPS_REQUESTED = true;
  if (typeof window.requestMotion === "function") {
    window.requestMotion();
  }
  let fakePos = {
    coords: {
      latitude: 31.2304,
      longitude: 121.4737,
    },
  };
  handleNewPosition(fakePos);
}

// auto-start the request after load so fallback kicks in even without interaction
window.addEventListener("load", () => {
  setTimeout(() => {
    requestGPS();
  }, 500);
});

function fixForChineseMap(pos) {
  console.log("fixForChineseMap", pos);
  let lat = pos.coords.latitude;
  let lon = pos.coords.longitude;
  console.log("fixForChineseMap fixing:", lat, lon);
  return wgs84togcj02(lon, lat);
}

// GAODE and TENCENT maps map pooints didfferent here is conversion (from chatGPT)
// WGS-84 → GCJ-02 (skip if outside CN bbox)
function wgs84togcj02(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat];
  const a = 6378245.0,
    ee = 0.00669342162296594323;
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180) * Math.PI;
  let magic = 1 - ee * Math.sin(radLat) ** 2;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [lng + dLng, lat + dLat];
}
function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}
function transformLat(x, y) {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * Math.PI) +
      320 * Math.sin((y * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}
function transformLng(x, y) {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * Math.PI) +
      300.0 * Math.sin((x / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
}
