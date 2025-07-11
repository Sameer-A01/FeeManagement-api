import express from "express";
import cors from 'cors';
import path from 'path';
import authRouter from "./routes/auth.js";
import categoryRouter from './routes/category.js';
import supplierRouter from './routes/supplier.js';
import productRouter from './routes/product.js';
import userRouter from './routes/user.js';
import orderRouter from './routes/order.js';
import dashboardRouter from './routes/dashboard.js';
import courseRoutes from './routes/courseRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import studentRoutes from './routes/studentRoutes.js'; // ✅ Import student routes
import uploadRoutes from './routes/uploadRoutes.js'; // ✅
import feePlanRoutes from './routes/feePlanRoutes.js';
import feePaymentRoutes from './routes/feePaymentRoutes.js';
import feeSummaryRoutes from './routes/feeSummaryRoutes.js'


import connectToMongoDB from "./db/connectToMongoDB.js";


const app = express()
app.use(express.static('public'));
app.use(cors())
app.use(express.json());
// Serve uploaded files
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));

app.use("/api/dashboard", dashboardRouter);
app.use("/api/auth", authRouter);
app.use("/api/supplier", supplierRouter);
app.use("/api/category", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/users", userRouter);
app.use("/api/order", orderRouter);
// Use course routes
app.use('/api/students', studentRoutes); // ✅ Use student routes
app.use('/api/upload', uploadRoutes); // ✅
app.use('/api/course', courseRoutes);
app.use('/api/section', sectionRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/fee-plans', feePlanRoutes);
app.use('/api/fee-payments', feePaymentRoutes);
app.use('/api/fees', feeSummaryRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});
app.listen(process.env.PORT, () => {
	connectToMongoDB();
	console.log(`Server Running on port ${process.env.PORT}`);
});
