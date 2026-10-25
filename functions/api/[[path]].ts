/**
 * Cloudflare Pages Function: serves EVERY /api/* route from the same origin as the site.
 * (A bare functions/api/index.ts would only match /api, which is why the old stub never worked.)
 * All logic lives in /server so it can be unit-tested with plain Node.
 */
import { handleRequest } from '../../server/router';
import type { Env } from '../../server/types';

interface PagesContext {
  request: Request;
  env: Env;
  waitUntil(promise: Promise<unknown>): void;
}

export const onRequest = (ctx: PagesContext): Promise<Response> =>
  handleRequest(ctx.request, ctx.env, { waitUntil: (p) => ctx.waitUntil(p) });
