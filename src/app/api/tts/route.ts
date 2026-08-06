import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Edge-TTS uses a WebSocket connection to Microsoft servers — must run on Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tts
 * body: { text: string, voice: string }
 * Returns: audio/mpeg (mp3) synthesized by Microsoft Edge TTS using the selected voice.
 *
 * This replaces the browser SpeechSynthesis backend so that the *selected* voice is
 * actually used (SpeechSynthesis only exposes locally-installed OS voices, which is
 * why every selection sounded identical).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice } = body as { text?: string; voice?: string };

    const voiceName = voice || "zh-CN-XiaoxiaoNeural";
    const cleanText = (text || "").trim();

    console.log("[api/tts] Synthesizing:", { voice: voiceName, textLength: cleanText.length });

    if (!cleanText) {
      return NextResponse.json({ success: false, error: "text is required" }, { status: 400 });
    }

    // Edge TTS has a practical per-request size limit — cap very long inputs.
    const MAX_CHARS = 8000;
    const input = cleanText.length > MAX_CHARS ? cleanText.slice(0, MAX_CHARS) : cleanText;

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(input);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      // Guard against a hung WebSocket connection (network blocked, etc.) so the
      // request cannot block forever.
      const timer = setTimeout(() => {
        console.error("[api/tts] Synthesis timed out after 30s");
        reject(new Error("Edge-TTS synthesis timed out"));
      }, 30000);
      const done = (err?: Error) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve();
      };
      audioStream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      audioStream.on("end", () => done());
      audioStream.on("close", () => done());
      audioStream.on("error", (err: Error) => done(err));
    });

    try {
      tts.close();
    } catch {
      // ignore close errors
    }

    const audioBuffer = Buffer.concat(chunks);
    console.log("[api/tts] Synthesized bytes:", audioBuffer.length);

    if (audioBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Edge-TTS returned empty audio (voice may be invalid or network blocked)" },
        { status: 502 }
      );
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[api/tts] Error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "TTS synthesis failed" },
      { status: 500 }
    );
  }
}
