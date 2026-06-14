export class MyIndexedDb {
    static readonly CURRENT_VERSION = 9;
    static readonly DATABASE_NAME = "dotScratch";
    
    // Using Record<string, string> ensures we can dynamically loop through keys
    static readonly DB_SCHEMA: Record<string, string> = {
        sketches: "id",
        thicknesses: "thickness",
        colors: "color",

        color_presets: "value",
        color_history: "value",

        thickness_presets: "value",
        thickness_history: "value",
        picker_data: "id",
    };

    // Tell TS that db starts as null but will become an IDBDatabase
    static db: IDBDatabase | null = null;

    static initialize(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(MyIndexedDb.DATABASE_NAME, MyIndexedDb.CURRENT_VERSION);
            
            request.onupgradeneeded = function (e: IDBVersionChangeEvent) {
                // Cast target explicitly to access .result safely
                const target = e.target as IDBOpenDBRequest;
                const upgradeDb = target.result;
                
                for (const tableName in MyIndexedDb.DB_SCHEMA) {
                    if (MyIndexedDb.DB_SCHEMA.hasOwnProperty(tableName)) {
                        const keyPathName = MyIndexedDb.DB_SCHEMA[tableName];

                        if (!upgradeDb.objectStoreNames.contains(tableName)) {
                            console.log(`Creating store ${tableName} with key: ${keyPathName}`);
                            upgradeDb.createObjectStore(tableName, { keyPath: keyPathName });
                        }
                    }
                }
            };
            
            request.onsuccess = (e: Event) => { 
                const target = e.target as IDBOpenDBRequest;
                MyIndexedDb.db = target.result; 
                resolve(MyIndexedDb.db); 
            };
            
            request.onerror = (e: Event) => {
                const target = e.target as IDBOpenDBRequest;
                reject("DB Error: " + target.error?.name);
            };
        });
    }

    static set(collectionName: string, value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!MyIndexedDb.db) return reject("Database not initialized. Call initialize() first.");

            const transaction = MyIndexedDb.db.transaction(collectionName, 'readwrite');
            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => resolve();

            const store = transaction.objectStore(collectionName);
            store.put(value);
        });
    }

    static get(collectionName: string, id: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!MyIndexedDb.db) return reject("Database not initialized. Call initialize() first.");

            const transaction = MyIndexedDb.db.transaction(collectionName, "readonly");
            transaction.onerror = () => reject(transaction.error);

            const store = transaction.objectStore(collectionName);
            const request = store.get(id);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    static getAll(collectionName: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!MyIndexedDb.db) return reject("Database not initialized. Call initialize() first.");

            const transaction = MyIndexedDb.db.transaction(collectionName, "readonly");
            transaction.onerror = () => reject(transaction.error);

            const collection = transaction.objectStore(collectionName);
            const request = collection.getAll();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    static filterAll(collectionName: string, filterCallback: (item: any) => boolean): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!MyIndexedDb.db) return reject("Database not initialized. Call initialize() first.");

            const transaction = MyIndexedDb.db.transaction(collectionName, "readonly");
            transaction.onerror = () => reject(transaction.error);

            const store = transaction.objectStore(collectionName);
            const results: any[] = [];

            const request = store.openCursor();
            request.onerror = () => reject(request.error);
            request.onsuccess = (e: Event) => {
                const target = e.target as IDBRequest<IDBCursorWithValue | null>;
                const cursor = target.result;

                if (cursor) {
                    const value = cursor.value;

                    if (filterCallback(value)) {
                        results.push(value);
                    }

                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
        });
    }

    static delete(collectionName: string, id: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!MyIndexedDb.db) return reject("Database not initialized. Call initialize() first.");
            
            const tx = MyIndexedDb.db.transaction(collectionName, 'readwrite');
            tx.objectStore(collectionName).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
}
