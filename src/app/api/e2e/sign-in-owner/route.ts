import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

const SESSION_COOKIE = '__session';
const CLIENT_UAT_COOKIE = '__client_uat';
const DEV_BROWSER_COOKIE = '__clerk_db_jwt';

function decodeJwtPayload(token: string) {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('Missing JWT payload.');
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { iat?: number };
}

export async function POST(request: Request) {
  if (process.env.PLAYWRIGHT_TEST !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const userId = body.userId?.trim();

  if (!userId) {
    return NextResponse.json({ error: 'A userId is required.' }, { status: 400 });
  }

  const client = await clerkClient();
  const session = await client.sessions.createSession({ userId });
  const sessionToken = await client.sessions.getToken(session.id);
  const testingToken = await client.testingTokens.createTestingToken();
  const sessionPayload = decodeJwtPayload(sessionToken.jwt);
  const clientUat = String(sessionPayload.iat || Math.floor(Date.now() / 1000));
  const response = NextResponse.json({ ok: true });
  const baseCookie = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: false,
  };

  response.cookies.set({
    ...baseCookie,
    name: SESSION_COOKIE,
    value: sessionToken.jwt,
  });
  response.cookies.set({
    ...baseCookie,
    name: DEV_BROWSER_COOKIE,
    value: testingToken.token,
  });
  response.cookies.set({
    ...baseCookie,
    name: CLIENT_UAT_COOKIE,
    value: clientUat,
  });

  return response;
}
