const http = require('http');

const PORT = 5000;
const BASE_PATH = '/api';

// Config
const EMAIL_PREFIX = 'testuser' + Math.floor(Math.random() * 10000);
const EMAIL = `${EMAIL_PREFIX}@example.com`;
const PASSWORD = 'Password123!';

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: BASE_PATH + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function log(msg) {
    console.log(`[TEST] ${msg}`);
}

async function run() {
    try {
        log(`Registering user ${EMAIL}...`);
        let res = await request('POST', '/auth/register', {
            firstName: "Test", lastName: "User", email: EMAIL, password: PASSWORD
        });

        if (res.status !== 201) {
            log(`Registration failed (might already exist?): ${JSON.stringify(res.data)}`);
            // Try login
        }

        // Login to get token
        log("Logging in...");
        res = await request('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
        if (res.status !== 200) {
            console.error("Login failed. Cannot proceed.", res.data);
            // If verify email is required, we might be stuck here unless we hack it.
            // But let's see.
            return;
        }
        const token = res.data.data.accessToken;
        log("Got Token.");

        // 1. Find a vehicle. We need Station -> Line -> Vehicle.
        // Get Stations
        log("Fetching Stations...");
        res = await request('GET', '/station');
        const stations = res.data.data.stations;
        if (!stations || stations.length === 0) {
            console.error("No stations found. Seed data required.");
            return;
        }
        const stationId = stations[0]._id;
        log(`Using Station: ${stationId}`);

        // Get Lines
        log(`Fetching Lines for Station ${stationId}...`);
        res = await request('GET', `/station/${stationId}/lines`);
        const lines = res.data.data; // Structure based on getLines controller
        // actually getAllLinesOfStation returns { count, data } or just array? 
        // Usually standard response wraps in data.
        // Let's assume standard wrapper.
        const lineList = lines.lines /* if wrapper */ || lines;

        if (!lineList || lineList.length === 0) {
            console.error("No lines found.");
            return;
        }
        const lineId = lineList[0]._id;
        log(`Using Line: ${lineId}`);

        // Get Vehicles
        log(`Fetching Vehicles for Line ${lineId}...`);
        res = await request('GET', `/station/${stationId}/lines/${lineId}/vichels`);
        // res.data -> { count, results } or similar
        const vehicles = res.data.results || res.data.data;
        if (!vehicles || vehicles.length === 0) {
            console.error("No vehicles found.");
            return;
        }
        const vehicle = vehicles[0];
        const vichelId = vehicle._id;
        log(`Using Vehicle: ${vehicle.plateNumber} (${vichelId})`);
        log(`Initial Available Seats: ${vehicle.availableSeats}`);

        // 2. Book a Seat
        log("Booking a seat...");
        res = await request('POST', `/station/${stationId}/lines/${lineId}/vichels/${vichelId}/book`, {}, token);
        if (res.status === 200) {
            log("Booking Successful.");
        } else {
            log("Booking Failed: " + JSON.stringify(res.data));
        }

        // 3. Check Vehicle again
        log("Checking available seats update...");
        res = await request('GET', `/station/${stationId}/lines/${lineId}/vichels/${vichelId}`); // Get One
        // Or get all and find
        const updatedVehicle = res.data.data;
        log(`New Available Seats: ${updatedVehicle.availableSeats} (Should be ${vehicle.availableSeats - 1})`);

        // 4. Check User History
        log("Checking User History...");
        res = await request('GET', '/auth/history', null, token);
        const userHistory = res.data.data;
        log(`User History Count: ${userHistory.length}`);
        if (userHistory.length > 0) {
            log(`Latest Booking Status: ${userHistory[0].status}`);
        }

        // 5. Check Active Trip (Current Passengers)
        log("Checking Active Trip (Current Passengers)...");
        res = await request('GET', `/station/${stationId}/lines/${lineId}/vichels/${vichelId}/active-trip`, null, token);
        const activeTripData = res.data.data;
        if (activeTripData && activeTripData.passengers) {
            log(`Active Passengers Count: ${activeTripData.passengers.length}`);
            log(`Available Seats (from response): ${activeTripData.vehicle.availableSeats}`);
        } else {
            log("Active Trip Data format unexpected: " + JSON.stringify(res.data));
        }

        // 6. Reset Passengers
        log("Resetting Passengers...");
        res = await request('POST', `/station/${stationId}/lines/${lineId}/vichels/${vichelId}/reset`, {}, token);
        log(`Reset Response: ${JSON.stringify(res.data)}`);

        // Check active trip AGAIN to verify it is empty
        log("Checking Active Trip AFTER Reset (Should be empty)...");
        res = await request('GET', `/station/${stationId}/lines/${lineId}/vichels/${vichelId}/active-trip`, null, token);
        const activeTripAfter = res.data.data;
        if (activeTripAfter && activeTripAfter.passengers) {
            log(`Active Passengers Count After Reset: ${activeTripAfter.passengers.length}`);
            if (activeTripAfter.passengers.length > 0) {
                log("ERROR: Passengers still active after reset!");
            } else {
                log("SUCCESS: Active line cleared.");
            }
        }

        // 8. Check Trip History (Grouped)
        log("Checking Trip History...");
        res = await request('GET', `/station/${stationId}/lines/${lineId}/vichels/${vichelId}/trips`, null, token);
        const tripsGrouped = res.data.data;
        log(`Trip Groups found: ${tripsGrouped ? tripsGrouped.length : 0}`);
        if (tripsGrouped && tripsGrouped.length > 0) {
            log(`Date: ${tripsGrouped[0]._id}, Passenger Count: ${tripsGrouped[0].totalPassengers}`);
            if (tripsGrouped[0].trips && tripsGrouped[0].trips.length > 0) {
                log(`First Trip Passengers: ${JSON.stringify(tripsGrouped[0].trips[0].bookings)}`);
            }
        }

    } catch (err) {
        console.error("Test Error:", err);
    }
}

run();
