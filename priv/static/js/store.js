export class NoteStore extends EventTarget {
  localStorageKey;
  notes = [];

  /*
  Note structure:

  - id - unique note ID
  - type - either `note` or `tasklist`
  - content - note's content
  - created - timestamp
  - updated - timestamp
  */

  constructor(localStorageKey) {
    super();
    this.localStorageKey = localStorageKey;

    this.#readStorage();

    // handle notes edited in another window
    window.addEventListener(
      "storage",
      () => {
        this.#readStorage();
        this.saveStorage();
      },
      false,
    );
  }

  all = () => this.notes;
  get = (id) => this.notes.find((note) => note.id === id);

  add(note) {
    const now = Date.now();

    this.notes.unshift({
      id: "id_" + now,
      type: note.type,
      content: note.content,
      created: now,
      updated: now,
    });
  }

  reset() {
    this.notes = [];
  }

  remove({ id }) {
    this.notes = this.notes.filter((note) => note.id !== id);
  }

  update(note) {
    note.updated = Date.now();
    this.notes = this.notes.map((n) => (n.id === note.id ? note : n));
  }

  saveStorage() {
    window.localStorage.setItem(
      this.localStorageKey + "_notes",
      JSON.stringify(this.notes),
    );
    this.dispatchEvent(new CustomEvent("save"));
  }

  #readStorage() {
    this.notes = JSON.parse(
      window.localStorage.getItem(this.localStorageKey + "_notes") || "[]",
    );
  }
}
