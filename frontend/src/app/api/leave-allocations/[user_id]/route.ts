import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    
    // Get the authorization header from the request
    const authHeader = request.headers.get("authorization");
    const orgHeader = request.headers.get("x-organization-id");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }
    
    if (!orgHeader) {
      return NextResponse.json({ error: "Organization ID header required" }, { status: 400 });
    }

    // Build the URL with optional year parameter
    let url = `${BACKEND_URL}/api/leave-allocations/${user_id}`;
    if (year) {
      url += `?year=${year}`;
    }

    // Forward the request to the backend
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "X-Organization-ID": orgHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching leave allocations:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave allocations" },
      { status: 500 }
    );
  }
}