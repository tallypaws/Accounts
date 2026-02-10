import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({cookies}) => {
    return new Response();
};