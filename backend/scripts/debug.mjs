process.on("uncaughtException",    (e) => console.error("uncaughtException:", e));
process.on("unhandledRejection",   (e) => console.error("unhandledRejection:", e));
process.on("exit",                 (c) => console.log("exit code:", c));
process.on("SIGTERM",              ()  => console.log("SIGTERM recibido"));
process.on("SIGINT",               ()  => console.log("SIGINT recibido"));

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { extname, basename, resolve } from "path";
import { createHash } from "crypto";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

console.log("Variables cargadas:", CLOUD_NAME, API_KEY?.substring(0,6));

const filePath  = resolve("C:\\Users\\richa\\OneDrive\\Desktop\\imagenes-pintered-para- tienda-remeras\\descarga.jpg");
const timestamp = Math.floor(Date.now() / 1000);
const folder    = "neon-stitch/test";
const sorted    = `folder=${folder}&timestamp=${timestamp}`;
const signature = createHash("sha256").update(sorted + API_SECRET).digest("hex");

console.log("Preparando upload de:", basename(filePath));
console.log("Signature:", signature.substring(0,20));

const fileBuffer = readFileSync(filePath);
const blob       = new Blob([fileBuffer], { type: "image/jpeg" });
const fd         = new globalThis.FormData();
fd.append("file",      blob, basename(filePath));
fd.append("folder",    folder);
fd.append("timestamp", String(timestamp));
fd.append("api_key",   API_KEY);
fd.append("signature", signature);

console.log("Enviando fetch a Cloudinary...");

const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
console.log("Status:", res.status);
const data = await res.json();
console.log("Respuesta:", JSON.stringify(data).substring(0, 200));
