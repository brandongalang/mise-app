// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

/**
 * Validates an image file before processing.
 * Throws ImageValidationError if validation fails.
 */
export function validateImageFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new ImageValidationError(`Image too large (${sizeMB}MB). Maximum size is 10MB.`);
  }

  // Check MIME type (note: this can be spoofed, but provides basic validation)
  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    throw new ImageValidationError(`Unsupported file type: ${file.type}. Please upload a JPEG, PNG, GIF, or WebP image.`);
  }
}

/**
 * Resizes an image to a maximum dimension while maintaining aspect ratio.
 * Returns the resized image as a base64 data URL.
 * Throws ImageValidationError if the file fails validation.
 */
export async function resizeImage(file: File, maxDimension = 1024, quality = 0.8): Promise<string> {
  // Validate before processing
  validateImageFile(file);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL(file.type, quality));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
