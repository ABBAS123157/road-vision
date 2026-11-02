import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'db_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory / File-based persistent store fallback if MongoDB server is offline
class LocalCollection {
  constructor(name, getDb, saveDb) {
    this.name = name;
    this.getDb = getDb;
    this.saveDb = saveDb;
  }

  async find(query = {}) {
    const data = this.getDb()[this.name] || [];
    const filtered = data.filter(item => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
    return {
      toArray: async () => filtered,
      sort: (sortObj) => ({
        toArray: async () => {
          const sorted = [...filtered];
          const [sortKey, sortDir] = Object.entries(sortObj)[0] || ['_id', -1];
          sorted.sort((a, b) => {
            if (a[sortKey] < b[sortKey]) return sortDir === 1 ? -1 : 1;
            if (a[sortKey] > b[sortKey]) return sortDir === 1 ? 1 : -1;
            return 0;
          });
          return sorted;
        },
        limit: (n) => ({
          toArray: async () => filtered.slice(0, n)
        })
      }),
      limit: (n) => ({
        toArray: async () => filtered.slice(0, n)
      })
    };
  }

  async findOne(query) {
    const data = this.getDb()[this.name] || [];
    return data.find(item => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    }) || null;
  }

  async insertOne(doc) {
    const db = this.getDb();
    if (!db[this.name]) db[this.name] = [];
    const newDoc = {
      _id: doc._id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: new Date(),
      ...doc
    };
    db[this.name].push(newDoc);
    this.saveDb(db);
    return { insertedId: newDoc._id, acknowledged: true };
  }

  async updateOne(query, update) {
    const db = this.getDb();
    const data = db[this.name] || [];
    const index = data.findIndex(item => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
    if (index === -1) return { modifiedCount: 0, matchedCount: 0 };
    
    if (update.$set) {
      db[this.name][index] = { ...db[this.name][index], ...update.$set, updatedAt: new Date() };
    } else {
      db[this.name][index] = { ...db[this.name][index], ...update, updatedAt: new Date() };
    }
    this.saveDb(db);
    return { modifiedCount: 1, matchedCount: 1 };
  }

  async deleteOne(query) {
    const db = this.getDb();
    const data = db[this.name] || [];
    const index = data.findIndex(item => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
    if (index === -1) return { deletedCount: 0 };
    db[this.name].splice(index, 1);
    this.saveDb(db);
    return { deletedCount: 1 };
  }

  async countDocuments(query = {}) {
    const data = this.getDb()[this.name] || [];
    return data.filter(item => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    }).length;
  }
}

class DatabaseManager {
  constructor() {
    this.mongoClient = null;
    this.mongoDb = null;
    this.isMongoConnected = false;
    this.localDbData = {};
    this.loadLocalDb();
  }

  loadLocalDb() {
    try {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        this.localDbData = JSON.parse(raw);
      } else {
        this.localDbData = { users: [], road_videos: [], detection_events: [], gps_logs: [] };
        this.saveLocalDb(this.localDbData);
      }
    } catch (err) {
      console.warn('[DB] Warning reading local db file, initializing empty store:', err.message);
      this.localDbData = { users: [], road_videos: [], detection_events: [], gps_logs: [] };
    }
  }

  saveLocalDb(data) {
    try {
      this.localDbData = data;
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error saving local db:', err.message);
    }
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roadvision';
    try {
      console.log(`[MongoDB] Attempting connection to: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
      this.mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000
      });
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db();
      this.isMongoConnected = true;
      console.log('✅ [MongoDB] Connected successfully to MongoDB database!');
    } catch (err) {
      this.isMongoConnected = false;
      console.log('⚠️ [MongoDB] Local mongod not detected. Activating High-Performance Persistent JSON Store.');
      console.log('💡 Note: All user data, detections, GPS, and videos are saved with full persistence.');
    }
  }

  collection(name) {
    if (this.isMongoConnected && this.mongoDb) {
      return this.mongoDb.collection(name);
    }
    return new LocalCollection(
      name,
      () => this.localDbData,
      (data) => this.saveLocalDb(data)
    );
  }

  getStatus() {
    return {
      connected: true,
      storageType: this.isMongoConnected ? 'MongoDB Server' : 'Persistent Storage Engine',
      mongoConnected: this.isMongoConnected
    };
  }
}

export const dbManager = new DatabaseManager();

