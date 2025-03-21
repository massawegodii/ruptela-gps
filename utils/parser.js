let deviceIMEI = {};

function parseRuptelaData(data, socket) {
  let timestamp = parseTimestamp(data);
  let gps = parseGPS(data);
  let speed = parseSpeed(data);

  return {
    imei: extractIMEI(data, socket),
    timestamp,
    latitude: gps.latitude,
    longitude: gps.longitude,
    altitude: gps.altitude,
    speed,
    ignition: data.readUInt8(18) & 1 ? "ON" : "OFF",
    latitudeHex: gps.latitudeHex,
    longitudeHex: gps.longitudeHex,
    latitudeBinary: gps.latitudeBinary,
    longitudeBinary: gps.longitudeBinary,
    rawData: data.toString("hex"),
  };
}

function extractIMEI(data, socket) {
  try {
    if (!deviceIMEI[socket.remoteAddress]) {
      let imeiBuffer = data.slice(2, 10);
      let imei = parseInt(imeiBuffer.toString("hex"), 16).toString();
      deviceIMEI[socket.remoteAddress] = imei;
    }
    return deviceIMEI[socket.remoteAddress];
  } catch (error) {
    console.error("Error extracting IMEI:", error);
    return "Unknown";
  }
}

function parseTimestamp(data) {
  try {
    let timestampRaw = data.readUInt32BE(0);
    return (timestampRaw < 1000000000 || timestampRaw > Date.now() / 1000)
      ? new Date()
      : new Date(timestampRaw * 1000);
  } catch (error) {
    console.error("Error parsing timestamp:", error);
    return new Date();
  }
}

function parseGPS(data) {
  try {
    let lonRaw = data.readInt32BE(20);
    let latRaw = data.readInt32BE(24);
    let altRaw = data.readUInt16BE(28);

    let latitude = latRaw / 1e7;
    let longitude = lonRaw / 1e7;
    let altitude = altRaw / 10.0;

    let latitudeHex = latRaw.toString(16).toUpperCase();
    let longitudeHex = lonRaw.toString(16).toUpperCase();
    let latitudeBinary = latRaw.toString(2).padStart(32, "0");
    let longitudeBinary = lonRaw.toString(2).padStart(32, "0");

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.warn("⚠ Invalid GPS coordinates received.");
      return {
        latitude: null,
        longitude: null,
        altitude: null,
        latitudeHex,
        longitudeHex,
        latitudeBinary,
        longitudeBinary,
      };
    }

    return {
      latitude,
      longitude,
      altitude,
      latitudeHex,
      longitudeHex,
      latitudeBinary,
      longitudeBinary,
    };
  } catch (error) {
    console.error("Error parsing GPS data:", error);
    return {
      latitude: null,
      longitude: null,
      altitude: null,
      latitudeHex: null,
      longitudeHex: null,
      latitudeBinary: null,
      longitudeBinary: null,
    };
  }
}

function parseSpeed(data) {
  try {
    let speed = data.readUInt16BE(18) / 10;
    return speed < 0.5 ? 0 : speed;
  } catch (error) {
    console.error("Error parsing speed:", error);
    return 0;
  }
}

module.exports = {
  parseRuptelaData,
};
