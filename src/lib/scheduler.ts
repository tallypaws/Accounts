import { DBNestedMapX } from "./db";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sessionDB } from "./sessions";
import { applicationDB } from "./applications";
import { refreshTokenDB } from "./oauth";
import { identityDB } from "./identity";
import { getDiscordUser, refreshDiscordAccessToken } from "./discord";
import { d } from "@thetally/toolbox";
import { getGitHubUser } from "./github";

const scheduledEventSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  scheduledTime: z.number(),
  payload: z.any(),
});

type ScheduledInternalEvent<T extends InternalEventName = InternalEventName> =
  Omit<z.infer<typeof scheduledEventSchema>, "payload" | "eventName"> & {
    payload: InternalEventPayload<T>;
    eventName: T;
  };

const internalSchedulesDB = await DBNestedMapX.create(
  "schedules",
  scheduledEventSchema,
  null,
  1
);

function generateEventId(): string {
  return `event-${randomUUID().replaceAll("-", "")}`;
}

const internalEvents = {
  test: (payload: { message: string }) => {
    console.log(`test fired with message: ${payload.message}`);
  },
  
  deleteSession: async (payload: { sessionId: string }) => {
    await sessionDB.delete(payload.sessionId);
    console.log(`Session ${payload.sessionId} expired and was deleted`);
  },

  deleteAuthCode: async (payload: { clientId: string; code: string }) => {
    const app = await applicationDB.getById(payload.clientId);
    if (app && app.authCodes?.[payload.code]) {
      delete app.authCodes[payload.code];
      await applicationDB.setById(payload.clientId, app);
      console.log(`Auth code ${payload.code} for app ${payload.clientId} expired and was deleted`);
    }
  },

  deleteRefreshToken: async (payload: { token: string }) => {
    await refreshTokenDB.delete(payload.token);
    console.log(`Refresh token expired and was deleted`);
  },

  refreshDiscordIdentity: async (payload: { identityId: string }) => {
    const identity = await identityDB.getById(payload.identityId);
    
    if (!identity || identity.provider !== 'discord') {
      console.log(`Discord identity ${payload.identityId} not found or invalid, stopping refresh loop`);
      return;
    }

    try {
      const tokenResponse = await refreshDiscordAccessToken(identity.refreshToken);
      const accessToken = tokenResponse.access_token;
      const newRefreshToken = tokenResponse.refresh_token;

      const discordUser = await getDiscordUser(accessToken);

      const updatedIdentity = {
        ...identity,
        refreshToken: newRefreshToken,
        lastRefreshedAt: Date.now(),
        data: {
          username: discordUser.username,
          avatarHash: discordUser.avatar
        }
      };
      await identityDB.setById(identity.id, updatedIdentity);
      console.log(`Discord identity ${payload.identityId} refreshed successfully`);

      const nextRefreshTime = Date.now() + d(4).toMs();
      await scheduleInternalEvent('refreshDiscordIdentity', nextRefreshTime, { identityId: payload.identityId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Invalid') || errorMessage.includes('revoked')) {
        console.log(`Discord access revoked for identity ${payload.identityId}, stopping refresh loop`);
        return;
      }

      console.error(`Error refreshing Discord identity ${payload.identityId}:`, error);
      
      const nextRetryTime = Date.now() + d(4).toMs();
      await scheduleInternalEvent('refreshDiscordIdentity', nextRetryTime, { identityId: payload.identityId });
    }
  },

  refreshGitHubIdentity: async (payload: { identityId: string }) => {
    // github tokens dont expire so just refetch the user every 4 days to keep username and avatar up to date
    console.log(`Refreshing GitHub identity ${payload.identityId}...`);

    const identity = await identityDB.getById(payload.identityId);
    
    if (!identity || identity.provider !== 'github') {
      console.log(`GitHub identity ${payload.identityId} not found or invalid, stopping refresh loop`);
      return;
    }

    try {
      const githubUser = await getGitHubUser(identity.accessToken, 'token');
      const updatedIdentity = {
        ...identity,
        lastRefreshedAt: Date.now(),
        data: {
          ...identity.data,
          username: githubUser.login,
          avatarUrl: githubUser.avatar_url ?? null
        }
      };
      await identityDB.setById(identity.id, updatedIdentity);
      console.log(`GitHub identity ${payload.identityId} refreshed successfully`);
    } catch (error) {
      console.error(`Error refreshing GitHub identity ${payload.identityId}:`, error);
    }

    const nextRefreshTime = Date.now() + d(4).toMs();
    await scheduleInternalEvent('refreshGitHubIdentity', nextRefreshTime, { identityId: payload.identityId });
  }

} as const;

type InternalEventName = keyof typeof internalEvents;
type InternalEventPayload<T extends InternalEventName> = Parameters<
  (typeof internalEvents)[T]
>[0];

async function getScheduledInternalEvents(): Promise<ScheduledInternalEvent[]> {
  const allEvents = await internalSchedulesDB.query().exec();
  return allEvents.map((entry) => entry as ScheduledInternalEvent);
}

let nextEventTimeout: NodeJS.Timeout | null = null;
let isUpdatingTimeout = false;

async function updateNextEventTimeout(): Promise<void> {
  if (isUpdatingTimeout) {
    return;
  }
  isUpdatingTimeout = true;

  try {
    if (nextEventTimeout !== null) {
      clearTimeout(nextEventTimeout);
      nextEventTimeout = null;
    }

    const now = Date.now();

    const pastEvents = await internalSchedulesDB
      .query()
      .where("value.scheduledTime", "<=", now)
      .sortBy("value.scheduledTime", "asc")
      .exec();

    for (const event of pastEvents) {
      await fireInternalEvent(event as ScheduledInternalEvent);
    }

    const [nextEvent] = await internalSchedulesDB
      .query()
      .where("value.scheduledTime", ">", now)
      .sortBy("value.scheduledTime", "asc")
      .limit(1)
      .exec();

    if (!nextEvent) return;

    const delay = Math.max(nextEvent.scheduledTime - now, 0);
    const MAX_TIMEOUT = 2_147_483_647;

    if (delay > MAX_TIMEOUT) {
      nextEventTimeout = setTimeout(async () => {
        await updateNextEventTimeout();
      }, MAX_TIMEOUT);
    } else {
      nextEventTimeout = setTimeout(async () => {
        await fireInternalEvent(nextEvent as ScheduledInternalEvent);
      }, delay);
    }
  } finally {
    isUpdatingTimeout = false;
  }
}

async function fireInternalEvent(event: ScheduledInternalEvent): Promise<void> {
  const handler = internalEvents[event.eventName] as (
    payload: InternalEventPayload<InternalEventName>
  ) => any;

  try {
    await handler(event.payload);
    console.log(
      `Event [${event.id}] of type [${event.eventName}] fired with payload:`,
      event.payload
    );
  } catch (error) {
    console.error(`Error firing event ${event.id}:`, error);
  }

  await internalSchedulesDB.delete([event.id]);

  await updateNextEventTimeout();
}

export async function scheduleInternalEvent<T extends InternalEventName>(
  eventName: T,
  scheduledTime: number,
  payload: InternalEventPayload<T>
): Promise<string> {
  const id = generateEventId();
  const newEvent: ScheduledInternalEvent<T> = {
    id,
    eventName,
    scheduledTime,
    payload,
  };

  await internalSchedulesDB.set([id], newEvent);

  const now = Date.now();

  const currentNextEvent = (
    await internalSchedulesDB
      .query()
      .where("value.scheduledTime", ">", now)
      .sortBy("value.scheduledTime", "asc")
      .limit(1)
      .exec()
  )[0] as ScheduledInternalEvent | undefined;

  if (currentNextEvent && currentNextEvent.id === newEvent.id) {
    console.log(
      `New event [${newEvent.id}] scheduled to fire at ${new Date(
        scheduledTime
      ).toISOString()} is now the next event. Resetting timer.`
    );
    await updateNextEventTimeout();
  } else {
    console.log(
      `New event [${newEvent.id}] scheduled to fire at ${new Date(
        scheduledTime
      ).toISOString()} added to queue.`
    );
  }

  return id;
}

export async function getScheduledEventsByType<T extends InternalEventName>(
  eventName: T
): Promise<ScheduledInternalEvent<T>[]> {
  const allEvents = await getScheduledInternalEvents();
  return allEvents.filter(
    (evt) => evt.eventName === eventName
  ) as ScheduledInternalEvent<T>[];
}

export async function cancelScheduledEvent(eventId: string): Promise<boolean> {
  const event = await internalSchedulesDB.get([eventId]);
  if (!event) {
    console.log(`Event with ID [${eventId}] not found.`);
    return false;
  }
  await internalSchedulesDB.delete([eventId]);
  console.log(`Event with ID [${eventId}] has been canceled.`);
  await updateNextEventTimeout();
  return true;
}

await updateNextEventTimeout();

