import { Request, Response } from 'express';
import { storageService } from '../services/storageService.js';

export const uploadController = {
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      // 1. Check if multipart file uploaded
      if (req.file) {
        const file = req.file;
        const result = await storageService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        res.status(201).json({
          success: true,
          url: result.url,
          key: result.key,
          bucket: result.bucket,
        });
        return;
      }

      // 2. Check if base64 provided in body
      if (req.body && req.body.base64) {
        let base64Data = req.body.base64 as string;
        let mimeType = 'image/jpeg';
        let originalName = req.body.fileName || `product_${Date.now()}.jpg`;

        if (base64Data.startsWith('data:')) {
          const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64Data = matches[2];
          }
        }

        const buffer = Buffer.from(base64Data, 'base64');
        const result = await storageService.uploadFile(buffer, originalName, mimeType);

        res.status(201).json({
          success: true,
          url: result.url,
          key: result.key,
          bucket: result.bucket,
        });
        return;
      }

      res.status(400).json({ error: 'No image file or base64 data provided' });
    } catch (error: any) {
      console.error('[UploadController] Error uploading image:', error);
      res.status(500).json({ error: error.message || 'Failed to upload image' });
    }
  },
};
