import type { ServerInit } from '@sveltejs/kit';
import { connectDB } from './lib/db';

export const init: ServerInit = async () => {
    await connectDB();
};