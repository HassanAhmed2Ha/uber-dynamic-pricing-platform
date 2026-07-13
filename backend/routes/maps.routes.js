const express = require('express');
const router = express.Router();
const mapController = require('../controllers/maps.controller');
const { query } = require('express-validator');

router.get('/get-coordinates',
    query('address').isString().isLength({ min: 3 }),
    mapController.getCoordinates
);

router.get('/get-suggestions',
    query('input').isString().isLength({ min: 3 }),
    mapController.getAutoCompleteSuggestions
);

module.exports = router;
