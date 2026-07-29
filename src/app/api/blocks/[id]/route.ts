import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDb();
    await execute("UPDATE blocks SET is_deleted = 1 WHERE id = ?", [params.id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
