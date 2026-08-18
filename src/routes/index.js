const Router = require('express').Router;

const router = Router();

router.get('/status', (req, res) => res.json({ status: 'ok', message: 'Authentication service is running' }));

router.use('/', require('./auth.routes'));
router.use('/users', require('./user.routes'));

module.exports = router;
