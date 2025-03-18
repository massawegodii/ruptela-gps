require('dotenv').config();
const net = require('net');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log(' MongoDB Connected'))
  .catch(err => console.error(' MongoDB Connection Error:', err));

// Define GPS Data Schema
const gpsSchema = new mongoose.Schema({
    imei: String,
    timestamp: Date,
    latitude: Number,
    longitude: Number,
    speed: Number,
    ignition: String,
    rawData: String
});
const GpsData = mongoose.model('GpsData', gpsSchema);

let deviceIMEI = {}; // Store IMEI per device

// Create TCP Server
const server = net.createServer((socket) => {
    console.log(' New GPS device connected:', socket.remoteAddress);

    socket.on('data', async (data) => {
        console.log(' Received Data:', data.toString('hex'));

        try {
            let parsedData = parseRuptelaData(data, socket);
            console.log(' Parsed GPS Data:', parsedData);

            // Save data to MongoDB
            const gpsEntry = new GpsData(parsedData);
            await gpsEntry.save();
            console.log(' Data saved to MongoDB');

            // Respond to GPS device (ACK)
            socket.write(Buffer.from([0x01])); // Acknowledge receipt

        } catch (error) {
            console.error(' Error parsing data:', error);
        }
    });

    socket.on('end', () => console.log('Device disconnected'));
    socket.on('error', (err) => console.error('⚠ Socket Error:', err));
});

// Start Server
server.listen(process.env.PORT, '0.0.0.0', () => {
    console.log(` TCP server listening on port ${process.env.PORT}`);
});

// Function to parse Ruptela ECO5 Lite Binary Data
function parseRuptelaData(data, socket) {
    let timestamp = parseTimestamp(data);
    let gps = parseGPS(data);
    let speed = parseSpeed(data);
    
    return {
        imei: extractIMEI(data, socket),
        timestamp: timestamp,
        latitude: gps.latitude,
        longitude: gps.longitude,
        speed: speed,
        ignition: (data.readUInt8(14) & 1) ? 'ON' : 'OFF',
        rawData: data.toString('hex')
    };
}

// Extract IMEI (Only once per device)
function extractIMEI(data, socket) {
    try {
        if (!deviceIMEI[socket.remoteAddress]) {
            let imeiBuffer = data.slice(2, 10);
            let imei = parseInt(imeiBuffer.toString('hex'), 16).toString();
            deviceIMEI[socket.remoteAddress] = imei;
        }
        return deviceIMEI[socket.remoteAddress];
    } catch (error) {
        console.error(" Error extracting IMEI:", error);
        return "Unknown";
    }
}

// Parse timestamp
function parseTimestamp(data) {
    let timestampRaw = data.readUInt32BE(0);
    
    if (timestampRaw < 1000000000) {
        console.warn("⚠ Invalid timestamp received. Using current time.");
        return new Date();
    }

    return new Date(timestampRaw * 1000);
}

// Parse GPS
function parseGPS(data) {
    let latRaw = data.readInt32BE(4);
    let lonRaw = data.readInt32BE(8);
    let latitude = latRaw / 10000000;
    let longitude = lonRaw / 10000000;

    if (latitude === 0 || longitude === 0 || isNaN(latitude) || isNaN(longitude)) {
        console.warn("⚠ GPS coordinates are invalid. Device may not have a fix.");
        return { latitude: null, longitude: null };
    }

    return { latitude, longitude };
}

// Parse speed
function parseSpeed(data) {
    let speed = data.readUInt16BE(12) / 10;

    if (speed > 0.1) {
        return speed;
    } else {
        console.warn("⚠ Device is stationary, setting speed to 0.");
        return 0;
    }
}
