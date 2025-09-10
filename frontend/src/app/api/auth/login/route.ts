import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Mock authentication logic
    if (username === 'admin' && password === 'password') {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        department: 'IT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      return NextResponse.json({
        data: {
          user: mockUser,
          token: mockToken,
        },
        message: 'Login successful',
      });
    }
    
    return NextResponse.json(
      { error: { message: 'Invalid credentials' } },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
