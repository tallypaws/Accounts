import { writable } from "svelte/store";

const prompts = [
    "TOTPOTP",
    "confirmation"
] as const;

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
};

type PromptResultMap = {
    TOTPOTP: {
        secret: string;
    };

    confirmation: {
        confirmed: boolean;
    };
};


export type PromptInstance<T extends PromptType = PromptType> = {
    id: string;
    type: T;
    params: PromptParamsMap[T];
};

export const activePrompts = writable<PromptInstance[]>([]);

const resolvers = new Map<
    string,
    (value: unknown) => void
>();

function randomId() {
    return crypto.randomUUID();
}

export function promptFor<T extends PromptType>(
    type: T,
    params: PromptParamsMap[T]
): Promise<PromptResultMap[T]> {
    const id = randomId();

    return new Promise<PromptResultMap[T]>((resolve) => {
        //@ts-ignore
        resolvers.set(id, resolve);

        activePrompts.update((p) => [
            ...p,
            { id, type, params }
        ]);
    });
}

export function resolvePrompt<T extends PromptType>(
    id: string,
    value: PromptResultMap[T]
) {
    const resolve = resolvers.get(id);
    if (!resolve) return;

    resolve(value);
    resolvers.delete(id);

    activePrompts.update((p) =>
        p.filter((x) => x.id !== id)
    );
}

export function rejectPrompt(id: string) {
    resolvers.delete(id);
    activePrompts.update((p) =>
        p.filter((x) => x.id !== id)
    );
}
