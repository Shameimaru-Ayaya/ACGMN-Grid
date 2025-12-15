// app/api/proxy/route.ts
import { NextResponse } from "next/server";

// Bangumi API User Agent
const BANGUMI_USER_AGENT = process.env.BANGUMI_USER_AGENT;

function isUrlAllowed(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  if (!isUrlAllowed(imageUrl)) {
    return new NextResponse("Invalid URL", { status: 403 });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": BANGUMI_USER_AGENT || "GameGrid/1.0",
    };

    // For Bangumi images, set referer to avoid hotlink protection
    const hostname = new URL(imageUrl).hostname;
    if (hostname.endsWith("bgm.tv") || hostname.endsWith("lain.bgm.tv")) {
      headers.Referer = "https://bgm.tv/";
    }

    const response = await fetch(imageUrl, { headers });
    if (!response.ok) {
      return new NextResponse(`Error fetching image: ${response.statusText}`, {
        status: response.status,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const respHeaders = new Headers();
    respHeaders.set(
      "Content-Type",
      response.headers.get("Content-Type") || "image/png"
    );
    respHeaders.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400");

    return new NextResponse(arrayBuffer, {
      headers: respHeaders,
    });
  } catch (error) {
    return new NextResponse(`Failed to fetch image: ${error}`, {
      status: 500,
    });
  }
}
