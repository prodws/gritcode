import { Client } from '@stomp/stompjs';

let client = null;
// topic → { sub: StompSubscription, handlers: Set<fn> }
const topics = new Map();
const pendingHandlers = new Map();

const ensureClient = () => {
    if (client) return client;
    client = new Client({
        brokerURL: `${(import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/^http/, 'ws')}/ws`,
        reconnectDelay: 2000,
    });
    client.onConnect = () => {
        // Subscribe to any topics that were registered before connection
        for (const [topic, handlers] of pendingHandlers.entries()) {
            doSubscribe(topic, handlers);
        }
        pendingHandlers.clear();
    };
    client.activate();
    return client;
};

const doSubscribe = (topic, handlers) => {
    const sub = client.subscribe(topic, (msg) => {
        let parsed;
        try { parsed = JSON.parse(msg.body); } catch { parsed = { raw: msg.body }; }
        for (const h of handlers) h(parsed);
    });
    topics.set(topic, { sub, handlers });
};

export const subscribeGame = (gameId, handler) => {
    const c = ensureClient();
    const topic = `/topic/game/${gameId}`;

    if (c.connected) {
        if (topics.has(topic)) {
            topics.get(topic).handlers.add(handler);
        } else {
            const handlers = new Set([handler]);
            doSubscribe(topic, handlers);
        }
    } else {
        if (!pendingHandlers.has(topic)) pendingHandlers.set(topic, new Set());
        pendingHandlers.get(topic).add(handler);
    }

    return () => {
        const entry = topics.get(topic);
        if (entry) {
            entry.handlers.delete(handler);
            if (entry.handlers.size === 0) {
                entry.sub.unsubscribe();
                topics.delete(topic);
            }
        } else {
            const pending = pendingHandlers.get(topic);
            if (pending) pending.delete(handler);
        }
    };
};
