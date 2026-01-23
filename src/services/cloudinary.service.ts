import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
}

export interface CloudinaryOptions {
  folder?: string;
  transformation?: any;
}

export class CloudinaryService {
  static async uploadImage(
    filePathOrBase64: string,
    options: CloudinaryOptions = {},
  ): Promise<UploadResult> {
    try {
      const uploadOptions: any = {
        folder: options.folder || "profile_images",
        resource_type: "image",
      };

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      // Handle both file paths and base64 strings
      const result = await cloudinary.uploader.upload(
        filePathOrBase64,
        uploadOptions,
      );

      return {
        url: result.url,
        publicId: result.public_id,
        secureUrl: result.secure_url,
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
      return false;
    }
  }

  static async updateImage(
    oldPublicId: string | null,
    newFilePathOrBase64: string,
    options: CloudinaryOptions = {},
  ): Promise<UploadResult> {
    if (oldPublicId) {
      await this.deleteImage(oldPublicId);
    }

    return this.uploadImage(newFilePathOrBase64, options);
  }

  static getOptimizedProfileImageUrl(
    publicId: string,
    width = 400,
    height = 400,
  ): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: "fill",
      gravity: "face",
      quality: "auto",
      fetch_format: "auto",
    });
  }
}
