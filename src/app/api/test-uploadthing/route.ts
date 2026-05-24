import { UTApi } from "uploadthing/server";

export async function GET() {
  try {
    const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
    const files = await utapi.listFiles({ limit: 1 });
    return Response.json({
      ok: true,
      message: "UploadThing connected",
      fileCount: files.files.length,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
