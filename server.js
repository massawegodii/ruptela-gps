require("dotenv").config();
const net = require("net");
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error(" MongoDB Connection Error:", err));

const gpsSchema = new mongoose.Schema({
  imei: String,
  timestamp: Date,
  latitude: Number,
  longitude: Number,
  altitude: Number,
  speed: Number,
  ignition: String,
  latitudeHex: String,
  longitudeHex: String,
  latitudeBinary: String,
  longitudeBinary: String,
  rawData: String,
});
const GpsData = mongoose.model("GpsData", gpsSchema);

let deviceIMEI = {};

const server = net.createServer((socket) => {
  console.log("New GPS device connected:", socket.remoteAddress);

  socket.on("data", async (data) => {
    console.log(" Received Data:", data.toString("hex"));

    try {
      let parsedData = parseRuptelaData(data, socket);
      console.log(" Parsed GPS Data:", parsedData);

      const gpsEntry = new GpsData(parsedData);
      await gpsEntry.save();
      console.log(" Data saved to MongoDB");

      // Acknowledge receipt
      socket.write(Buffer.from([0x01]));
    } catch (error) {
      console.error("Error parsing data:", error);
    }
  });

  socket.on("end", () => console.log(" Device disconnected"));
  socket.on("error", (err) => console.error("⚠ Socket Error:", err));
});

server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(` TCP server listening on port ${process.env.PORT}`);
});

// *🔹 Parsing Functions*
function parseRuptelaData(data, socket) {
  let timestamp = parseTimestamp(data);
  let gps = parseGPS(data);
  let speed = parseSpeed(data);

  return {
    imei: extractIMEI(data, socket),
    timestamp: timestamp,
    latitude: gps.latitude,
    longitude: gps.longitude,
    altitude: gps.altitude,
    speed: speed,
    ignition: data.readUInt8(18) & 1 ? "ON" : "OFF",
    latitudeHex: gps.latitudeHex,
    longitudeHex: gps.longitudeHex,
    latitudeBinary: gps.latitudeBinary,
    longitudeBinary: gps.longitudeBinary,
    rawData: data.toString("hex"),
  };
}

// *🔹 Extract IMEI (Only once per device)*
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

// *🔹 Parse Timestamp*
function parseTimestamp(data) {
  try {
    let timestampRaw = data.readUInt32BE(0);

    if (timestampRaw < 1000000000 || timestampRaw > Date.now() / 1000) {
      console.warn("⚠ Invalid timestamp received. Using current time.");
      return new Date();
    }

    return new Date(timestampRaw * 1000);
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

    // Convert to decimal degrees
    let latitude = latRaw / 1e7;
    let longitude = lonRaw / 1e7;
    let altitude = altRaw / 10.0;

    // Convert to Hexadecimal and Binary for debugging
    let latitudeHex = latRaw.toString(16).toUpperCase();
    let longitudeHex = lonRaw.toString(16).toUpperCase();
    let latitudeBinary = latRaw.toString(2).padStart(32, "0");
    let longitudeBinary = lonRaw.toString(2).padStart(32, "0");

    // Validate coordinate range
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
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

    if (speed < 0.5) {
      console.warn("Device is stationary, setting speed to 0.");
      return 0;
    }
    return speed;
  } catch (error) {
    console.error(" Error parsing speed:", error);
    return 0;
  }
}
