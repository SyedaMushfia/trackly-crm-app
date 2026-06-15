import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

// Extracts the storage path from a public avatar URL, e.g.
// ".../storage/v1/object/public/avatars/{userId}/{ts}.jpg" -> "{userId}/{ts}.jpg"
function extractStoragePath(publicUrl: string): string | null {
  const marker = "/avatars/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

// POST — upload/replace the current user's profile picture
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WEBP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
  }

  const ext = EXT_BY_TYPE[file.type];
  const path = `${session.user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = urlData.publicUrl;

  // Fetch the previous avatar so we can clean it up after the update succeeds
  const { data: existingUser } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", session.user.id)
    .single();

  const { error: updateError } = await supabase
    .from("users")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", session.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Non-fatal cleanup of the old file
  if (existingUser?.avatar_url) {
    const oldPath = extractStoragePath(existingUser.avatar_url);
    if (oldPath) {
      const { error: removeError } = await supabase.storage.from("avatars").remove([oldPath]);
      if (removeError) console.error("[avatar] Failed to remove old file:", removeError.message);
    }
  }

  return NextResponse.json({ avatarUrl });
}

// DELETE — remove the current user's profile picture (revert to initials)
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existingUser } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", session.user.id)
    .single();

  const { error } = await supabase
    .from("users")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existingUser?.avatar_url) {
    const oldPath = extractStoragePath(existingUser.avatar_url);
    if (oldPath) {
      const { error: removeError } = await supabase.storage.from("avatars").remove([oldPath]);
      if (removeError) console.error("[avatar] Failed to remove file:", removeError.message);
    }
  }

  return NextResponse.json({ success: true });
}