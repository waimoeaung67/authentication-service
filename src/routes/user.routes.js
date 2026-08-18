const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

router.get('/me', authenticateToken, userController.getMe);
router.put('/me', authenticateToken, userController.updateMe);
router.get('/', authenticateToken, authorizeAdmin, userController.listUsers);
router.get('/:id', authenticateToken, authorizeAdmin, userController.getUserById);
router.put('/:id/role', authenticateToken, authorizeAdmin, userController.updateUserRole);
router.delete('/:id', authenticateToken, authorizeAdmin, userController.deleteUser);
router.put('/:id/password', authenticateToken, userController.changePassword);
router.get('/validate', authenticateToken, userController.validateToken);

module.exports = router;
