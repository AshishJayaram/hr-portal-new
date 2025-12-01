import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward the request to the backend API
    // Use internal backend URL, not the public API URL to avoid redirect loops
    let backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    // Prevent redirect loop: if backendUrl points to the same origin, use localhost backend
    const requestUrl = new URL(request.url);
    if (backendUrl.includes(requestUrl.hostname) && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
      // If backend URL points to same domain, assume backend is on different port
      backendUrl = `http://localhost:8080`;
    }
    
    const backendApiUrl = `${backendUrl}${backendUrl.endsWith('/api') ? '' : '/api'}/dashboard/stats${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendApiUrl, {
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
        { error: { message: data.error || 'Failed to fetch dashboard stats' } },
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
