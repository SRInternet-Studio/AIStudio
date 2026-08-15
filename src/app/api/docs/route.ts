import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DOC_FILES: Record<string, string> = {
  welcome: "WELCOME.md",
  readme: "README.md",
  license: "LICENSE.md",
  development: "DEVELOPMENT.md",
  security: "SECURITY.md",
  contributing: "CONTRIBUTING.md",
  "code-of-conduct": "CODE_OF_CONDUCT.md",
  disclaimer: "DISCLAIMER.md",
};

export async function GET(request: NextRequest) {
  const doc = request.nextUrl.searchParams.get("doc");
  const lang = request.nextUrl.searchParams.get("lang") === "zh" ? "zh" : "en";
  if (!doc || !DOC_FILES[doc]) {
    return NextResponse.json(
      { success: false, error: "Unknown document" },
      { status: 400 }
    );
  }

  try {
    // turbopackIgnore: the doc files are read from the project root at
    // runtime on the SAME machine (self-hosted app) — opt out of Turbopack's
    // whole-project tracing that a dynamic path.join would otherwise cause.
    const filePath =
      lang === "zh"
        ? path.join(/*turbopackIgnore: true*/ process.cwd(), "Docs", DOC_FILES[doc])
        : path.join(/*turbopackIgnore: true*/ process.cwd(), DOC_FILES[doc]);
    const content = fs.readFileSync(filePath, "utf-8");
    console.log("[api/docs] Serving", DOC_FILES[doc], "lang:", lang, "bytes:", content.length);
    return NextResponse.json({ success: true, data: { doc, lang, content } });
  } catch (error: any) {
    console.error("[api/docs] Failed to read", DOC_FILES[doc], error?.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
