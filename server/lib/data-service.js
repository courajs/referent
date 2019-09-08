import {
  open,
  getFromCollection,
  writeToCollection,
  ensureClockForCollection,
} from './db.js';
import * as sw from './sw-comms.js';

export class Collection {
  constructor(db, id) {
    this.db = db;
    this.id = id;
    this.clock = {local:0,remote:0};
    this.data = [];
    this.handlers = [];
    this.loading = false;
    this.again = false;
  }

  async update() {
    if (this.loading) {
      this.again = true;
      return;
    }
    this.loading = true;
    let {
      clock,
      values
    } = await getFromCollection(this.db, this.id, this.clock);
    this.clock = clock;
    this.data.push(...values);
    this._notify();
    this.loading = false;
    if (this.again) {
      this.again = false;
      this.update();
    }
  }

  onUpdate(h) {
    this.handlers.push(h);
  }

  _notify() {
    this.handlers.forEach(h=>h(this.data));
  }

  async write(data) {
    if (!Array.isArray(data)) { throw new Error('pass an array'); }
    await writeToCollection(this.db, this.id, data);
    sw.send('update');
  }
  async writeAndUpdate(data) {
    await this.write(data);
    return this.update();
  }
}

let dbp = open();
export async function collection(id) {
  let db = await dbp;

  await ensureClockForCollection(db, id);
  sw.send('ask');

  let c = new Collection(db, id);
  await c.update();
  sw.on('update', ()=>c.update());

  return c;
}

let resolve;
export const whenAuthed = new Promise((r) => resolve = r);
export async function isAuthed() {
  let db = await dbp;
  return !!await db.get('meta', 'client_id');
}
export function auth (id) {
  sw.send({kind:'auth',value:id});
}

export async function getClientName() {
  let db = await dbp;
  return db.get('meta', 'client_id');
}

sw.on('authed', () => {
  resolve();
});
