const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');

/**
 * POST /rides/create
 * Public endpoint (no auth) — ML pricing demo.
 * Creates a ride record in MongoDB with the ML-predicted USD fare.
 */
module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination, vehicleType } = req.body;

    try {
        const ride = await rideService.createRide({
            pickup,
            destination,
            vehicleType,
            host: req.get('host'),
            cookie: req.headers.cookie,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Ride confirmed successfully! ML fare applied.',
            ride: {
                id:                    ride._id,
                pickup:                ride.pickup,
                destination:           ride.destination,
                vehicleType,
                fare_usd:              ride.fare,
                ml_predicted_fare_usd: ride.ml_predicted_fare_usd,
                distance_km:           ride.distance_km,
                trip_timestamp:        ride.trip_timestamp,
            },
        });
    } catch (error) {
        console.error('Error creating ride:', error.message);
        const statusCode = error.message.includes('Location not found') ? 400 : 500;
        return res.status(statusCode).json({ message: 'Failed to create ride', detail: error.message });
    }
};

/**
 * GET /rides/get-fare
 * Public endpoint (no auth) — returns ML-predicted USD fares for all vehicle types.
 */
module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;
    try {
        const fare = await rideService.getfare(pickup, destination, req.get('host'), req.headers.cookie);
        return res.status(200).json({ fare });
    } catch (error) {
        const statusCode = error.message.includes('Location not found') ? 400 : 500;
        return res.status(statusCode).json({ message: 'Failed to get fare', detail: error.message });
    }
};