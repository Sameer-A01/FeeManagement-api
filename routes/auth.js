import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js'
import { login, verify } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.get('/verify',authMiddleware, verify)

export default router
