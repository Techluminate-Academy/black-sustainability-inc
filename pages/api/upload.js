import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (using environment variables; be cautious exposing secrets with NEXT_PUBLIC_)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

// Disable Next.js body parsing so that multer can handle the form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Set up multer to use memory storage so that we can access the file buffer
const upload = multer({ storage: multer.memoryStorage() });

// A helper function to run middleware in Next.js API routes
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // Allow only POST method
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Run the multer middleware to process the file upload
    await runMiddleware(req, res, upload.single("file"));

    // Check if a file is present
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // Use the file buffer from multer
    const fileBuffer = req.file.buffer;

    // Upload to Cloudinary using a stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "your_folder_name" }, // Replace with your desired folder name
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(fileBuffer);
    });

    res.status(200).json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
