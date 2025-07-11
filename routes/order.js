import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js'
import { addOrder, getOrders } from '../controllers/orderController.js';

const router = express.Router();

router.get('/:id', authMiddleware, getOrders);
router.post('/add', authMiddleware, addOrder);

export default router 