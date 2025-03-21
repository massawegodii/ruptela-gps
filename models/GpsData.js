const mongoose = require("mongoose");

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

module.exports = mongoose.model("GpsData", gpsSchema);
