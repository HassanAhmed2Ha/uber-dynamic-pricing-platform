const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const axios = require('axios');

// We resolve the AI Engine URL dynamically per request using the incoming host header.
// This is perfectly robust for serverless monorepos and requires no Vercel env config.
const getAiEngineUrl = (host) => {
    if (!host) return process.env.AI_ENGINE_URL || 'http://localhost:7860/api/predict';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}/api/predict`;
};

// Vehicle-type multipliers applied on top of the ML base fare.
// The model predicts a standard sedan fare; these scale it per vehicle class.
const VEHICLE_MULTIPLIERS = { car: 1.00, auto: 0.85, moto: 0.70 };

async function getfare(pickup, destination, host, cookie) {
    if (!pickup || !destination) throw new Error('Pickup and destination are required');

    const [pickupCoords, dropoffCoords] = await Promise.all([
        mapService.getAddressCoordinate(pickup),
        mapService.getAddressCoordinate(destination),
    ]);

    let aiResponse;
    try {
        const aiUrl = getAiEngineUrl(host);
        const endpoint = aiUrl.endsWith('/api/predict')
            ? aiUrl
            : `${aiUrl}/api/predict`;

        aiResponse = await axios.post(
            endpoint,
            {
                data: [
                    parseFloat(pickupCoords.lat),
                    parseFloat(pickupCoords.lng),
                    parseFloat(dropoffCoords.lat),
                    parseFloat(dropoffCoords.lng),
                    1,
                    new Date().toISOString(),
                ],
            },
            {
                timeout: 10000,
                headers: cookie ? { cookie } : {}
            }
        );
    } catch (error) {
        if (error.response?.data) {
            const errPayload = error.response.data.error || error.response.data.detail || error.response.data;
            const errMsg = typeof errPayload === 'object' ? JSON.stringify(errPayload) : errPayload;
            throw new Error(`AI Engine Error: ${errMsg}`);
        }
        throw new Error(`Failed to contact AI Engine: ${error.message}`);
    }

    const { estimated_fare_usd, calculated_distance_km } = aiResponse.data.data[0];

    return {
        car:  parseFloat((estimated_fare_usd * VEHICLE_MULTIPLIERS.car).toFixed(2)),
        auto: parseFloat((estimated_fare_usd * VEHICLE_MULTIPLIERS.auto).toFixed(2)),
        moto: parseFloat((estimated_fare_usd * VEHICLE_MULTIPLIERS.moto).toFixed(2)),
        ml_predicted_fare_usd:  estimated_fare_usd,
        calculated_distance_km: calculated_distance_km,
    };
}

module.exports.getfare = getfare;

module.exports.createRide = async ({ pickup, destination, vehicleType, host, cookie }) => {
    if (!pickup || !destination || !vehicleType) {
        throw new Error('Pickup, destination and vehicleType are required');
    }

    const fareData = await getfare(pickup, destination, host, cookie);

    return rideModel.create({
        pickup,
        destination,
        fare:                  fareData[vehicleType],
        ml_predicted_fare_usd: fareData.ml_predicted_fare_usd,
        distance_km:           fareData.calculated_distance_km,
    });
};
