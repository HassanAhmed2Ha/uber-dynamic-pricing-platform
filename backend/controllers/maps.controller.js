const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');

module.exports.getCoordinates = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const coordinates = await mapService.getAddressCoordinate(req.query.address);
        res.json({ address: req.query.address, coordinates });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports.getAutoCompleteSuggestions = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const suggestions = await mapService.getAutoCompleteSuggestions(req.query.input);
        res.status(200).json({ suggestions });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};