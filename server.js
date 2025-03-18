require('dotenv').config();
const net = require('net');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log(' MongoDB Connected'))
  .catch(err => console.error(' MongoDB Connection Error:', err));

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

const server = net.createServer((socket) => {
    console.log(' New GPS device connected:', socket.remoteAddress);

    socket.on('data', async (data) => {
        console.log(' Received Data:', data.toString('hex'));

        try {
            let parsedData = parseRuptelaData(data, socket);
            console.log(' Parsed GPS Data:', parsedData);

            const gpsEntry = new GpsData(parsedData);
            await gpsEntry.save();
            console.log(' Data saved to MongoDB');

            socket.write(Buffer.from([0x01])); 

        } catch (error) {
            console.error(' Error parsing data:', error);
        }
    });

    socket.on('end', () => console.log(' Device disconnected'));
    socket.on('error', (err) => console.error('⚠ Socket Error:', err));
});

server.listen(process.env.PORT, '0.0.0.0', () => {
    console.log(` TCP server listening on port ${process.env.PORT}`);
});

// **Parsing Functions**
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
        ignition: (data.readUInt8(18) & 1) ? 'ON' : 'OFF', // Adjusted offset
        rawData: data.toString('hex')
    };
}

function extractIMEI(data, socket) {
    try {
        if (!deviceIMEI[socket.remoteAddress]) {
            let imeiBuffer = data.slice(2, 10);
            let imei = parseInt(imeiBuffer.toString('hex'), 16).toString();
            deviceIMEI[socket.remoteAddress] = imei;
        }
        return deviceIMEI[socket.remoteAddress];
    } catch (error) {
        console.error("❌ Error extracting IMEI:", error);
        return "Unknown";
    }
}

function parseTimestamp(data) {
    try {
        let timestampRaw = data.readUInt32BE(0);
        
        if (timestampRaw < 1000000000 || timestampRaw > Date.now() / 1000) {
            console.warn("⚠ Invalid timestamp received. Using current time.");
            return new Date();
        }

        return new Date(timestampRaw * 1000);
    } catch (error) {
        console.error(" Error parsing timestamp:", error);
        return new Date();
    }
}

function parseGPS(data) {
    try {
        let latRaw = data.readInt32BE(8);
        let lonRaw = data.readInt32BE(12);
        
        let latitude = latRaw / 10000000;
        let longitude = lonRaw / 10000000;

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.warn("⚠ Invalid GPS coordinates received.");
            return { latitude: null, longitude: null };
        }

        return { latitude, longitude };
    } catch (error) {
        console.error(" Error parsing GPS data:", error);
        return { latitude: null, longitude: null };
    }
}

function parseSpeed(data) {
    try {
        let speed = data.readUInt16BE(16) / 10;

        if (speed < 0.5) {
            console.warn("⚠ Device is stationary, setting speed to 0.");
            return 0;
        }
        return speed;
    } catch (error) {
        console.error(" Error parsing speed:", error);
        return 0;
    }
}
