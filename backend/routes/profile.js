const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/auth');

router.get('/', authMiddleware, profileController.getProfile);
router.put('/personal', authMiddleware, profileController.updatePersonal);
router.put('/medical', authMiddleware, profileController.updateMedical);
router.put('/insulin', authMiddleware, profileController.updateInsulin);
router.put('/lifestyle', authMiddleware, profileController.updateLifestyle);
router.put('/health', authMiddleware, profileController.updateHealth);

module.exports = router;
