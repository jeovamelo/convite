import fs from 'fs';
import path from 'path';

export type InviteRecord = {
  id: string;
  public_id: string;
  token_hash: string;
  quantidade_pessoas: number;
  status: 'AVAILABLE' | 'USED' | 'CANCELLED';
  created_at: string;
  used_at: string | null;
  guest_name?: string;
  checked_in_by?: string;
};

export type MockDBState = {
  tickets: InviteRecord[];
  settings: any;
  baseImage: string | null;
};

const DB_PATH = path.join(process.cwd(), '.data', 'db.json');

// Ensure directory exists
if (!fs.existsSync(path.join(process.cwd(), '.data'))) {
  fs.mkdirSync(path.join(process.cwd(), '.data'), { recursive: true });
}

// Ensure file exists
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ tickets: [], settings: null, baseImage: null }), 'utf-8');
}

// We use a Proxy to automatically save to file whenever mockDB is modified.
// This is a simple trick for a JSON file DB.
const loadDB = (): MockDBState => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { tickets: [], settings: null, baseImage: null };
  }
};

const saveDB = (state: MockDBState) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
};

const globalForMock = global as unknown as { mockDB: MockDBState };

if (!globalForMock.mockDB) {
  const initialState = loadDB();
  
  // Proxy to intercept changes to tickets array and save DB
  const handler = {
    set(target: any, property: string, value: any) {
      target[property] = value;
      saveDB(globalForMock.mockDB);
      return true;
    }
  };

  initialState.tickets = new Proxy(initialState.tickets, handler);
  globalForMock.mockDB = new Proxy(initialState, handler);
}

export const mockDB = globalForMock.mockDB;
