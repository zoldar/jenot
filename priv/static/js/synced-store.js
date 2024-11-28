class WebNoteStore {
  constructor(endpoint) {
    this.endpoint = endpoint || "/";
  }

  async all(lastSync, includeDeleted) {
    const params = new URLSearchParams();
    if (lastSync > 0) {
      params.append("since", lastSync);
    }
    if (includeDeleted) {
      params.append("deleted", "true");
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    return this.#request(`${this.endpoint}api/notes${suffix}`, {}, () => []);
  }

  async get(id) {
    return this.#request(`${this.endpoint}api/notes/${id}`, {}, () => null);
  }

  async add(note) {
    return this.#request(
      `${this.endpoint}api/notes`,
      {
        method: "POST",
        body: JSON.stringify(note),
      },
      () => null,
    );
  }

  async update(note) {
    return this.#request(
      `${this.endpoint}api/notes/${note.id}`,
      {
        method: "PUT",
        body: JSON.stringify(note),
      },
      () => null,
    );
  }

  async #request(url, opts, errorCallback) {
    opts.headers = {
      ...(opts.headers || {}),
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, opts);
      if (!response.ok) {
        console.error("Request failed", response);
        return errorCallback(response);
      }
      return response.json();
    } catch (error) {
      console.error("Request error", error);
      return errorCallback(error);
    }
  }
}

export class SyncedNoteStore extends EventTarget {
  constructor(dbName, storeName, endpoint, webStore) {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.webStore = webStore || (endpoint && new WebNoteStore(endpoint));
  }

  async all(since, includeDeleted) {
    const that = this;
    return this.#connect().then(
      (db) =>
        new Promise((resolve, reject) => {
          db
            .transaction([that.storeName], "readonly")
            .objectStore(that.storeName)
            .getAll().onsuccess = (data) => {
            const results = data.target.result.filter(
              (n) => (includeDeleted || !n.deleted) && n.id !== "meta",
            );

            if (since > 0) {
              return resolve(results.filter((n) => n.updated > since));
            }

            return resolve(results);
          };
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

  async getMeta() {
    return this.get("meta").then((meta) => meta || { lastSync: null });
  }

  async setMeta(meta) {
    meta.id = "meta";
    this.update(meta, true);
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
      deleted: null,
    };
    return this.#connect()
      .then(
        (db) =>
          new Promise(
            (resolve, reject) =>
              (db
                .transaction([that.storeName], "readwrite")
                .objectStore(that.storeName)
                .add(entry).onsuccess = () => resolve(null)),
          ),
      )
      .then(() => {
        (async () => this.webStore?.add(entry))();
        return null;
      });
  }

  async remove(note) {
    const that = this;

    note.deleted = Date.now();

    return this.update(note);
  }

  async update(note, skipNetwork) {
    const that = this;

    if (!skipNetwork) {
      note.updated = Date.now();
    }

    return this.#connect()
      .then(
        (db) =>
          new Promise(
            (resolve, reject) =>
              (db
                .transaction([that.storeName], "readwrite")
                .objectStore(that.storeName)
                .put(note).onsuccess = () => resolve(null)),
          ),
      )
      .then(() => {
        (async () => (skipNetwork ? null : this.webStore?.update(note)))();
        return null;
      });
  }

  async sync() {
    const that = this;
    const meta = await this.getMeta();
    const lastSync = meta?.lastSync;

    this.all(lastSync, true)
      .then((notes) => {
        notes.forEach(async (n) => await that.webStore.add(n));
      })
      .then(() => that.webStore.all(lastSync, true))
      .then((notes) => {
        notes.forEach(async (n) => await that.update(n, true));
      })
      .then(() => {
        meta.lastSync = Date.now();

        that.setMeta(meta);
      });
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

  #request(url, opts, emptyValue) {
    new Promise((resolve) => {
      return resolve(this.#runRequest(url, opts, () => emptyValue));
    });
  }

  async #runRequest(url, opts, errorCallback) {
    opts.headers = {
      ...(opts.headers || {}),
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, opts);
      if (!response.ok) {
        console.error("Request failed", response);
        return errorCallback(response);
      }
      return response.json();
    } catch (error) {
      console.error("Request error", error);
      return errorCallback(error);
    }
  }
}
