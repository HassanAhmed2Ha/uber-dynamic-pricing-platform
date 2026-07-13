const axios = require('axios');

const NOMINATIM_HEADERS = {
    'User-Agent': 'RydeApp/1.0 (demo ml platform)'
};

module.exports.getAddressCoordinate = async (address) => {
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                format: 'json',
                q: address,
                limit: 1
            },
            headers: NOMINATIM_HEADERS
        });

        if (!response.data || response.data.length === 0) {
            throw new Error('No results found for the provided address.');
        }

        const location = response.data[0];
        // Return { lat, lng } to keep compatibility with existing ride.service.js expectations
        return {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon)
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports.getDistanceTime = async (origin, destination) => {
    // This is no longer used in the ML-only architecture.
    // The ML engine computes distance via Haversine.
    throw new Error('Distance/Time API is disabled in ML demo mode.');
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if(!input) {
        throw new Error('Input is required');
    }

    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                format: 'json',
                q: input,
                limit: 5
            },
            headers: NOMINATIM_HEADERS
        });

        if (response.data) {
            // Map the response to match the structure the frontend expects 
            // LocationSearchPanel uses suggestion.description
            return response.data.map(item => ({
                description: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            }));
        } else {
            throw new Error('Unable to fetch suggestions');
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}