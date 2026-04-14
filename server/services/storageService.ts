import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION || "eu-central-003";
const ENDPOINT = process.env.S3_ENDPOINT;
const ACCESS_KEY = process.env.S3_ACCESS_KEY;
const SECRET_KEY = process.env.S3_SECRET_KEY;

let s3Client: S3Client | null = null;

if (ACCESS_KEY && SECRET_KEY && ENDPOINT) {
  s3Client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
    // Required for Backblaze B2 S3 compatibility
    forcePathStyle: true,
  });
  console.log("[StorageService] S3 Client initialized for bucket:", BUCKET);
} else {
  console.warn("[StorageService] S3 credentials missing, falling back to local storage");
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  error?: string;
}

export async function uploadFile(
  fileData: Buffer | string | Readable,
  fileName: string,
  folder: string = "evidence",
  contentType: string = "application/octet-stream"
): Promise<UploadResult> {
  const key = `${folder}/${fileName}`;

  // 1. If S3 is configured, upload to cloud
  if (s3Client && BUCKET) {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET,
          Key: key,
          Body: fileData,
          ContentType: contentType,
        },
      });

      await upload.done();
      
      // If bucket is private, we'll need signed URLs, otherwise direct URL
      // Backblaze direct URL format: https://[bucket].[endpoint]/[key]
      const url = `${ENDPOINT}/${BUCKET}/${key}`;
      return { success: true, url, key };
    } catch (error) {
      console.error("[StorageService] S3 Upload failed:", error);
      return { success: false, url: "", key: "", error: String(error) };
    }
  }

  // 2. Fallback to local storage
  try {
    const localDir = path.join(process.cwd(), "uploads", folder);
    await fs.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    
    if (typeof fileData === "string") {
      await fs.writeFile(localPath, Buffer.from(fileData, "base64"));
    } else if (fileData instanceof Buffer) {
      await fs.writeFile(localPath, fileData);
    } else {
      const { Readable } = await import("stream");
      if (fileData instanceof Readable) {
        const res = fileData as Readable;
        const writeStream = (await import("fs")).createWriteStream(localPath);
        res.pipe(writeStream);
      } else {
        throw new Error("Invalid file data type for local pipe fallback");
      }
    }

    return { 
      success: true, 
      url: `/uploads/${folder}/${fileName}`, 
      key 
    };
  } catch (error) {
    console.error("[StorageService] Local save failed:", error);
    return { success: false, url: "", key: "", error: String(error) };
  }
}

export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (s3Client && BUCKET) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error("[StorageService] Failed to generate signed URL:", error);
    }
  }
  
  // Fallback to local URL if S3 fails or is not configured
  return `/api/${key}`;
}

export async function deleteFile(key: string): Promise<boolean> {
  if (s3Client && BUCKET) {
    try {
      await s3Client.send(new (await import("@aws-sdk/client-s3")).DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }));
      return true;
    } catch (error) {
      console.error("[StorageService] S3 Delete failed:", error);
    }
  }

  try {
    const localPath = path.join(process.cwd(), "uploads", key);
    await fs.unlink(localPath);
    return true;
  } catch (error) {
    return false;
  }
}

export function getS3Config() {
  if (!s3Client || !BUCKET) return null;
  return {
    bucket: BUCKET,
    region: REGION,
    endpoint: ENDPOINT,
  };
}
