let databases = {};
let memory = {};

async function connect(dbName) {
  if (!databases[dbName]) {
    databases[dbName] = await dbConnect(dbName);
  }

  return databases[dbName];
}

function dbConnect(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      console.error(`indexedDB error: ${e.target.errorCode}`);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      db.createObjectStore("notes", {
        keyPath: "id",
      });
    };
  });
}

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
    return this.#request(
      `${this.endpoint}api/notes${suffix}`,
      {},
      () => "no_network",
    );
  }

  async get(id) {
    return this.#request(
      `${this.endpoint}api/notes/${id}`,
      {},
      () => "no_network",
    );
  }

  async add(note) {
    return this.#request(
      `${this.endpoint}api/notes`,
      {
        method: "POST",
        body: JSON.stringify(note),
      },
      () => "no_network",
    );
  }

  async update(note) {
    return this.#request(
      `${this.endpoint}api/notes/${note.id}`,
      {
        method: "PUT",
        body: JSON.stringify(note),
      },
      () => "no_network",
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
  constructor(dbName, endpoint, webStore) {
    super();
    this.dbName = dbName;
    this.storeName = "notes";
    this.db = null;
    this.webStore = webStore || (endpoint && new WebNoteStore(endpoint));
  }

  async init() {
    await this.fetchAll().then((allNotes) => {
      memory[this.dbName] = {};
      memory[this.dbName][this.storeName] = {};

      allNotes.forEach((note) => {
        memory[this.dbName][this.storeName][note.id] = note;
      });
    });
  }

  async fetchAll() {
    const that = this;

    return connect(this.dbName).then(
      (db) =>
        new Promise((resolve, reject) => {
          db
            .transaction([that.storeName], "readonly")
            .objectStore(that.storeName)
            .getAll().onsuccess = (data) => {
            return resolve(data.target.result);
          };
        }),
    );
  }

  async all(since, includeDeleted) {
    const results = Object.values(memory[this.dbName][this.storeName])
      .filter((n) => (includeDeleted || !n.deleted) && n.id !== "meta")
      .toSorted((a, b) => b.created - a.created);

    if (since > 0) {
      return results.filter((n) => n.updated > since);
    }

    return results;
  }

  async get(id) {
    return memory[this.dbName][this.storeName][id];
  }

  async getMeta() {
    return this.get("meta").then((meta) => meta || { lastSync: null });
  }

  async setMeta(meta) {
    meta.id = "meta";
    return this.update(meta, true);
  }

  async add(note) {
    const that = this;
    const now = Date.now();

    const entry = {
      id: "id_" + now,
      type: note.type,
      content: note.content,
      reminder: note.reminder
        ? {
            enabled: note.reminder.enabled,
            date: note.reminder.date,
            time: note.reminder.time,
            repeat: note.reminder.count,
            unit: note.reminder.unit != "" ? note.reminder.unit : null,
          }
        : null,
      created: now,
      updated: now,
      deleted: null,
    };

    return connect(this.dbName)
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
        memory[this.dbName][this.storeName][entry.id] = structuredClone(entry);

        this.webStore?.add(entry);

        return entry;
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

    return connect(this.dbName)
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
        memory[this.dbName][this.storeName][note.id] = structuredClone(note);

        if (!skipNetwork) this.webStore?.add(note);

        return note;
      });
  }

  async sync() {
    const that = this;
    const meta = await this.getMeta();
    const lastSync = meta?.lastSync;
    const currentSync = Date.now();

    return this.all(lastSync, true)
      .then((notes) => {
        return Promise.all(notes.map((n) => that.webStore.add(n)));
      })
      .then((results) => {
        if (results.indexOf("no_network") < 0) {
          return that.webStore.all(lastSync, true);
        } else {
          return "no_network";
        }
      })
      .then((notes) => {
        if (notes !== "no_network") {
          notes.forEach(async (n) => await that.update(n, true));
          return null;
        } else {
          return "no_network";
        }
      })
      .then((result) => {
        if (result !== "no_network") {
          meta.lastSync = currentSync;

          that.setMeta(meta);
        }
      });
  }

  saveStorage() {
    this.dispatchEvent(new CustomEvent("save"));
  }
}
