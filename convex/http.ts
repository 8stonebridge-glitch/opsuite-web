import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

http.route({
  path: '/api/webhook/delete-user',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Simple shared secret check
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    const authHeader = request.headers.get('x-webhook-secret');
    if (!webhookSecret || authHeader !== webhookSecret) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const authUserId = body.authUserId;

    if (!authUserId || typeof authUserId !== 'string') {
      return new Response('Missing authUserId', { status: 400 });
    }

    await ctx.runMutation(internal.users.deleteByAuthUserId, { authUserId });

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
});

export default http;
