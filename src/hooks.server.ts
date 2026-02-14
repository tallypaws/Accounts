import type { ServerInit } from '@sveltejs/kit';
import { connectDB } from '$lib/db';
import { updateNextEventTimeout } from '$lib/scheduler';

export const init: ServerInit = async () => {
    await connectDB();
    await updateNextEventTimeout();
};