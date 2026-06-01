import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, { url: string; ts: number }>();
const TTL = 1000 * 60 * 60 * 24; // 24h

export async function GET(
  _req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const { videoId } = params;
  if (!videoId) return NextResponse.json({ error: "missing" }, { status: 400 });

  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ url: cached.url });
  }

  try {
    const res = await fetch(
      `https://vimeo.com/api/v2/video/${videoId}.json`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json({ url: null });
    const data = await res.json();
    const url: string = data[0]?.thumbnail_large ?? null;
    if (url) cache.set(videoId, { url, ts: Date.now() });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
