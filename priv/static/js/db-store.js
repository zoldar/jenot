export class DBNoteStore extends EventTarget {
  constructor(dbName, storeName) {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  async all() {
    const that = this;
    return this.#connect().then(
      (db) =>
        new Promise((resolve, reject) => {
          db
            .transaction([that.storeName], "readonly")
            .objectStore(that.storeName)
            .getAll().onsuccess = (data) => resolve(data.target.result);
        }),
    );
  }

  async get(id) {
    const that = this;
    let result;

    return this.#connect().then(
      (db) =>
        new Promise(
          (resolve, reject) =>
            (db
              .transaction([that.storeName], "readonly")
              .objectStore(that.storeName)
              .get(id).onsuccess = (data) => resolve(data.target.result)),
        ),
    );
  }

  async add(note) {
    const that = this;
    const now = Date.now();

    const entry = {
      id: "id_" + now,
      type: note.type,
      content: note.content,
      created: now,
      updated: now,
    };

    return this.#connect().then(
      (db) =>
        new Promise(
          (resolve, reject) =>
            (db
              .transaction([that.storeName], "readwrite")
              .objectStore(that.storeName)
              .add(entry).onsuccess = () => resolve(null)),
        ),
    );
  }

  async reset() {
    const that = this;

    return this.#connect().then(
      (db) =>
        new Promise(
          (resolve, reject) =>
            (db
              .transaction([that.storeName], "readwrite")
              .objectStore(that.storeName)
              .clear().onsuccess = () => resolve(null)),
        ),
    );
  }

  async remove({ id }) {
    const that = this;

    return this.#connect().then(
      (db) =>
        new Promise(
          (resolve, reject) =>
            (db
              .transaction([that.storeName], "readwrite")
              .objectStore(that.storeName)
              .delete(id).onsuccess = () => resolve(null)),
        ),
    );
  }

  async update(note) {
    const that = this;

    note.updated = Date.now();

    return this.#connect().then(
      (db) =>
        new Promise(
          (resolve, reject) =>
            (db
              .transaction([that.storeName], "readwrite")
              .objectStore(that.storeName)
              .put(note).onsuccess = () => resolve(null)),
        ),
    );
  }

  saveStorage() {
    this.dispatchEvent(new CustomEvent("save"));
  }

  async #connect() {
    if (!this.db) {
      this.db = await this.#dbConnect();
    }

    return this.db;
  }

  #dbConnect() {
    const that = this;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onsuccess = (e) => {
        resolve(e.target.result);
      };

      request.onerror = (e) => {
        console.error(`indexedDB error: ${e.target.errorCode}`);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        db.createObjectStore(that.storeName, {
          keyPath: "id",
        });
      };
    });
  }
}
