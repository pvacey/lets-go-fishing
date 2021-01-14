import { DBSchema, openDB } from 'idb';
import { CardInfo } from '../game-state/card';

const dbName = 'lets-go-fishing-db';
const dbVersion = 1;

interface FishingSchema extends DBSchema {
    'cards-os': {
        key: string;
        value: Blob;
    };

    'decks-os': {
        key: string;
        value: CardInfo[];
    };
}

enum StoreNames {
    Card = 'cards-os',
    Deck = 'decks-os',
}

const dbPromise = openDB<FishingSchema>(dbName, dbVersion, {
    upgrade(db) {
        db.createObjectStore(StoreNames.Card);
        db.createObjectStore(StoreNames.Deck);
    },
});

class DbSvc {
    async getCardBlob(name: string) {
        return (await dbPromise).get(StoreNames.Card, name);
    }

    async putCardBlob(blob: Blob, name: string) {
        return (await dbPromise).put(StoreNames.Card, blob, name);
    }

    // Retrieve the first deck for now.
    async getDeck() {
        const decks = await (await dbPromise).getAll(StoreNames.Deck);
        return decks.length ? decks[0] : null;
    }

    async putDeck(cardList: CardInfo[], name: string) {
        return (await dbPromise).put(StoreNames.Deck, cardList, name);
    }
}

export const DatabaseService = new DbSvc();
