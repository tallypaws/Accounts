import { writable } from "svelte/store";

const prompts = [
    "TOTPOTP",
    "confirmation",
    "changeUsername"
] as const;

export const promptOpen = writable(false);

type PromptType = typeof prompts[number];

type PromptParamsMap = {
    TOTPOTP: {
        title?: string;
    };

    confirmation: {
        title: string;
        description?: string;
        confirmText?: string;
        confirmCountdown?: number;
        confirmVariant?: 'default' | 'destructive';

        cancelText?: string;
    };

    changeUsername: {
        currentUsername: string;
    }
};

type PromptResultMap = {
    TOTPOTP: {
        secret: string;
    };

    confirmation: {
        confirmed: boolean;
    };

    changeUsername: {
        username: string;
    };
};


export type PromptInstance<T extends PromptType = PromptType> = {
    id: string;
    type: T;
    params: PromptParamsMap[T];
};

export const activePrompts = writable<PromptInstance[]>([]);
let activePromptsStatic = [] as PromptInstance[];

export const activePrompt = writable<PromptInstance | null>(null);

activePrompts.subscribe((value) => {
    activePromptsStatic = value;
});

const resolvers = new Map<
    string,
    {
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
        settled: boolean;
    }
>();

function randomId() {
    return crypto.randomUUID();
}

export function promptFor<T extends PromptType>(
    type: T,
    params: PromptParamsMap[T]
): Promise<PromptResultMap[T]> {
    const id = randomId();

    return new Promise<PromptResultMap[T]>((resolve, reject) => {
        //@ts-ignore
        let settled = false;
        resolvers.set(id, {
            resolve: (value: PromptResultMap[T]) => {
                if (resolvers.get(id)?.settled) return;
                resolvers.set(id, { resolve, reject, settled: true });
                resolve(value);
                promptOpen.set(false);

            },
            reject: (reason?: any) => {
                if (resolvers.get(id)?.settled) return;
                resolvers.set(id, { resolve, reject, settled: true });
                reject(reason);
                promptOpen.set(false);
            },
            settled
        });

        activePrompts.update((p) => [
            ...p,
            { id, type, params }
        ]);

        activePrompt.set({ id, type, params });
        promptOpen.set(true);
    });
}

export function resolvePrompt<T extends PromptType>(
    id: string,
    value: PromptResultMap[T]
) {
    console.log('Resolving prompt', id, value);
    const resolve = resolvers.get(id);
    if (!resolve) return;

    resolve.resolve(value);
}

export function rejectPrompt(id: string) {
    console.log('Rejecting prompt', id);
    const resolve = resolvers.get(id);
    if (!resolve) return;

    resolve.reject(null);
}

export function deletePrompt(id: string) {
    console.log('Deleting prompt', id);
    const resolve = resolvers.get(id);
    if (!resolve) return;
    if (!resolve.settled) {
        resolve.reject(null);
    }
    resolvers.delete(id);
    activePrompts.update((p) =>
        p.filter((x) => x.id !== id)
    );
    if (activePromptsStatic.length === 0) {
        promptOpen.set(false);
    }
    if (activePrompt) {
        activePrompt.set(null);
    }
    if (activePromptsStatic.length > 0) {
        activePrompt.set(activePromptsStatic[0]);
    }
}