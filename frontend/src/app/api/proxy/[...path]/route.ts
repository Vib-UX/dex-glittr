import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://devnet-core-api.glittr.fi";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the path
    const path = params.path.join("/");

    // Get the search params
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Build the target URL
    const targetUrl = `${API_BASE}/${path}${
      queryString ? `?${queryString}` : ""
    }`;

    console.log(`Proxying GET request to: ${targetUrl}`);

    // Make the request to the API
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get the data from the response
    const data = await response.json();

    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error forwarding request:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the path
    const path = params.path.join("/");

    // Get the request body
    const body = await request.json();

    // Build the target URL
    const targetUrl = `${API_BASE}/${path}`;

    console.log(`Proxying POST request to: ${targetUrl}`);

    // Make the request to the API
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Get the data from the response
    const data = await response.json();

    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error forwarding request:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Allow any origin
  const origin = request.headers.get("origin") || "*";

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
      "Access-Control-Allow-Headers":
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
