// routes/uploadRoutes.js
import express from 'express';
import upload from '../utils/multerConfig.js';

const router = express.Router();

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, fileUrl });
});

export default router;
