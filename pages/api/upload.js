import nextConnect from "next-connect";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with your NEXT_PUBLIC_ variables (note: exposing your API secret on the client is not recommended)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

// Disable Next.js's built-in body parser so multer can handle the multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Set up multer to parse the file data; using memory storage so we can get a buffer
const upload = multer({ storage: multer.memoryStorage() });

const apiRoute = nextConnect({
  onError(error, req, res) {
    console.error("Error in API route:", error);
    res.status(501).json({ error: `Sorry something happened! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Use multer middleware to handle a single file under the field name "file"
apiRoute.use(upload.single("file"));

apiRoute.post(async (req, res) => {
  try {
    // The file is now available on req.file
    const fileBuffer = req.file.buffer;
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
});

export default apiRoute;
