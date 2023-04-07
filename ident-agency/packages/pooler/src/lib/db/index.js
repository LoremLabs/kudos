import AdapterLevelDb from 'pouchdb-adapter-leveldb';
import PouchDB from 'pouchdb-core';
PouchDB.plugin(AdapterLevelDb);

const log = console.log;

// PoolDb - manages the pool database
export const PoolDb = function ({ adapter, name, collection }) {
  this.name = name || 'pool';
  this.adapter = adapter || 'leveldb';
  this.collection = collection || 'pool-dev';

  this.db = new PouchDB(this.name, {
    adapter: this.adapter,
  });
};

PoolDb.prototype.init = async function ({}) {
  const { db } = this;

  // get the current status of the database, stored in _local/status
    const status = await db.info();

}
