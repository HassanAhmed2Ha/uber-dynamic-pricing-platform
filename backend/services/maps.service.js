const axios = require('axios');

// Nominatim requires a descriptive User-Agent per their usage policy.
const NOMINATIM_HEADERS = { 'User-Agent': 'RydeApp/1.0 (demo ml platform)' };

module.exports.getAddressCoordinate = async (address) => {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { format: 'json', q: address, limit: 1 },
        headers: NOMINATIM_HEADERS,
    });

    if (!response.data || response.data.length === 0) {
        throw new Error('No results found for the provided address.');
    }

    const location = response.data[0];
    // Return { lat, lng } to match the shape expected by ride.service.js
    return { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
};

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) throw new Error('Input is required');

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { format: 'json', q: input, limit: 5 },
        headers: NOMINATIM_HEADERS,
    });

    if (!response.data) throw new Error('Unable to fetch suggestions');

    // Map to { description, lat, lon } — shape consumed by LocationSearchPanel
    return response.data.map(item => ({
        description: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
    }));
};