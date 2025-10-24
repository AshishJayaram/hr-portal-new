import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization');
    const orgId = request.headers.get('x-organization-id');

    if (!token || !orgId) {
      return NextResponse.json(
        { error: { message: 'Missing authorization or organization ID' } },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/api/holidays/${params.id}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'X-Organization-ID': orgId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: { message: data.error || 'Failed to fetch holiday' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching holiday:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization');
    const orgId = request.headers.get('x-organization-id');

    if (!token || !orgId) {
      return NextResponse.json(
        { error: { message: 'Missing authorization or organization ID' } },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${backendUrl}/api/holidays/${params.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token,
        'X-Organization-ID': orgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: { message: data.error || 'Failed to update holiday' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization');
    const orgId = request.headers.get('x-organization-id');

    if (!token || !orgId) {
      return NextResponse.json(
        { error: { message: 'Missing authorization or organization ID' } },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/api/holidays/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token,
        'X-Organization-ID': orgId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: { message: data.error || 'Failed to delete holiday' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
