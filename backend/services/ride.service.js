const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const crypto = require('crypto');
const axios = require('axios');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5000';

/**
 * Vehicle-type fare multipliers applied on top of the ML base fare (USD).
 * The AI engine predicts a base fare for a standard taxi trip. These
 * multipliers adjust for vehicle class without retraining the model.
 *
 *   car  = 1.00x  (standard sedan — model baseline)
 *   auto = 0.85x  (auto-rickshaw — more economical)
 *   moto = 0.70x  (motorcycle — cheapest option)
 */
const VEHICLE_MULTIPLIERS = {
    car:  1.00,
    auto: 0.85,
    moto: 0.70,
};

// ---------------------------------------------------------------------------
// Fare Calculation (ML-powered)
// ---------------------------------------------------------------------------

/**
 * Fetches an ML-predicted fare from the AI Engine microservice.
 *
 * Flow:
 *   1. Geocode pickup + destination addresses → lat/lng (Google Maps API)
 *   2. POST coordinates to the Python AI Engine (Haversine + ML model)
 *   3. Apply per-vehicle-type multipliers to the returned USD base fare
 *
 * @param {string} pickup       - Human-readable pickup address
 * @param {string} destination  - Human-readable destination address
 * @returns {Promise<Object>} fare object with car/auto/moto in USD, plus ml metadata
 */
async function getfare(pickup, destination) {
    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    // Step 1: Geocode both addresses to lat/lng coordinates in parallel
    let pickupCoords, dropoffCoords;
    try {
        [pickupCoords, dropoffCoords] = await Promise.all([
            mapService.getAddressCoordinate(pickup),
            mapService.getAddressCoordinate(destination),
        ]);
    } catch (err) {
        if (err.message.includes('No results found')) {
            throw new Error('Location not found. Please provide a more specific address.');
        }
        throw err;
    }

    // Step 2: Call AI Engine for ML-predicted base fare (USD)
    let aiResponse;
    try {
        aiResponse = await axios.post(
            `${AI_ENGINE_URL}/api/predict`,
            {
                data: [
                    parseFloat(pickupCoords.lat),
                    parseFloat(pickupCoords.lng),
                    parseFloat(dropoffCoords.lat),
                    parseFloat(dropoffCoords.lng),
                    1,
                    new Date().toISOString()
                ]
            },
            { timeout: 10000 } // 10-second timeout to avoid hanging the booking flow
        );
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            throw new Error(`AI Engine Error: ${error.response.data.error}`);
        }
        throw new Error(`Failed to contact AI Engine: ${error.message}`);
    }

    // Gradio returns the output inside a `data` array (at index 0 since we only have one output block)
    const { estimated_fare_usd, calculated_distance_km } = aiResponse.data.data[0];

    // Step 3: Apply vehicle-type multipliers (all prices remain in USD)
    return {
        car:  parseFloat((estimated_fare_usd * VEHICLE_MULTIPLIERS.car).toFixed(2)),
        auto: parseFloat((estimated_fare_usd * VEHICLE_MULTIPLIERS.auto).toFixed(2)),
        moto: parseFloat((estimated_fare_usd * VEHICLE_MULTIPLIERS.moto).toFixed(2)),
        // ML metadata — stored in the Ride document and forwarded to the frontend
        ml_predicted_fare_usd:    estimated_fare_usd,
        calculated_distance_km:   calculated_distance_km,
    };
}

module.exports.getfare = getfare;


// ---------------------------------------------------------------------------
// Ride Creation
// ---------------------------------------------------------------------------

/**
 * Creates a new Ride document in MongoDB.
 * Stores the ML-predicted base fare, vehicle-adjusted fare (USD),
 * trip distance, and timestamp for analytics.
 *
 * @param {Object} params
 * @param {string} params.pickup      - Pickup address string
 * @param {string} params.destination - Destination address string
 * @param {string} params.vehicleType - 'car' | 'auto' | 'moto'
 */
module.exports.createRide = async ({ pickup, destination, vehicleType }) => {
    if (!pickup || !destination || !vehicleType) {
        throw new Error('Pickup, destination and vehicleType are required');
    }

    const fareData = await getfare(pickup, destination);

    const ride = await rideModel.create({
        pickup,
        destination,
        // Vehicle-adjusted fare in USD (this is what the user pays)
        fare:                  fareData[vehicleType],
        // ML metadata fields for analytics and transparency
        ml_predicted_fare_usd: fareData.ml_predicted_fare_usd,
        distance_km:           fareData.calculated_distance_km,
    });

    return ride;
};
