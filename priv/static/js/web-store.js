export class WebNoteStore extends EventTarget {
  constructor(dbName, storeName, endpoint) {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.endpoint = endpoint || "/";
  }

  async all() {
    return this.#request(`${this.endpoint}api/notes`, {}, () => []);
  }

  async get(id) {
    console.log("get", id);
    return this.#request(`${this.endpoint}api/notes/${id}`, {}, () => null);
  }

  async add(note) {
    const now = Date.now();

    const entry = {
      id: "id_" + now,
      type: note.type,
      content: note.content,
    };

    return this.#request(
      `${this.endpoint}api/notes`,
      {
        method: "POST",
        body: JSON.stringify(entry),
      },
      () => null,
    );
  }

  async reset() {
    // NOOP for now
    return null;
  }

  async remove({ id }) {
    return this.#request(
      `${this.endpoint}api/notes/${id}`,
      {
        method: "DELETE",
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

  saveStorage() {
    this.dispatchEvent(new CustomEvent("save"));
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
