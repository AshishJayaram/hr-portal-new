import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    
    // Get the authorization header from the request
    const authHeader = request.headers.get("authorization");
    const orgHeader = request.headers.get("x-organization-id");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }
    
    if (!orgHeader) {
      return NextResponse.json({ error: "Organization ID header required" }, { status: 400 });
    }

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/leaves/balance/${user_id}`, {
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
    console.error("Error fetching leave balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balance" },
      { status: 500 }
    );
  }
}
