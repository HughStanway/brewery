import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleProxy(request, params.path);
}

export async function POST(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleProxy(request, params.path);
}

export async function PUT(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleProxy(request, params.path);
}

export async function DELETE(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleProxy(request, params.path);
}

async function handleProxy(request: NextRequest, pathSegments?: string[]) {
  const path = pathSegments ? pathSegments.join("/") : "";
  const searchParams = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/${path}${searchParams}`;

  const headers = new Headers(request.headers);
  // Remove host header to prevent connection/proxy mismatches
  headers.delete("host");

  try {
    const body = request.method !== "GET" && request.method !== "HEAD" 
      ? await request.arrayBuffer() 
      : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
      // @ts-ignore
      duplex: body ? "half" : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    // Remove content-encoding to avoid issues if Next.js tries to re-compress the proxy response
    responseHeaders.delete("content-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`Failed to proxy ${targetUrl}:`, error);
    return new NextResponse(JSON.stringify({ error: "Failed to proxy request", details: error.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
