const express = require('express');
const router = express.Router();
const ideasMejorasController = require('../controllers/ideasMejorasController');

// Vista principal
router.get('/', ideasMejorasController.index);

module.exports = router;

