import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ user_id: string }> }) {
  try {
    const paramsResolved = await params;
    const userId = paramsResolved.user_id;
    
    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/audit/logs/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'X-Organization-ID': request.headers.get('X-Organization-ID') || '',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: { message: data.error || 'Failed to fetch user audit logs' } },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
