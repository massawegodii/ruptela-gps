import mongoose from "mongoose";

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
export default GpsData;
