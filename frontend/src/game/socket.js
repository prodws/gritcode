import { Client } from '@stomp/stompjs';

let client = null;
const subscriptions = new Map();

const ensureClient = () => {
    if (client && client.connected) return client;
    if (client) return client;
    client = new Client({
        brokerURL: 'ws://localhost:8080/ws',
        reconnectDelay: 2000,
    });
    client.activate();
    return client;
};

export const subscribeGame = (gameId, handler) => {
    const c = ensureClient();
    const topic = `/topic/game/${gameId}`;

    const doSubscribe = () => {
        const sub = c.subscribe(topic, (msg) => {
            try {
                handler(JSON.parse(msg.body));
            } catch {
                handler({ raw: msg.body });
            }
        });
        subscriptions.set(topic, sub);
    };

    if (c.connected) {
        doSubscribe();
    } else {
        c.onConnect = () => doSubscribe();
    }

    return () => {
        const sub = subscriptions.get(topic);
        if (sub) {
            sub.unsubscribe();
            subscriptions.delete(topic);
        }
    };
};
