export class NoteStore extends EventTarget {
  localStorageKey;
  notes = [];
  editedNoteId = "none";

  /*
  Note structure:

  - id - unique note ID
  - type - either `note` or `tasklist`
  - content - note's content
  - created - timestamp
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
  getEditedNoteId = () => this.editedNoteId;

  add(note) {
    this.notes.unshift({
      id: "id_" + Date.now(),
      type: note.type,
      content: note.content,
      created: new Date(),
    });
  }

  reset() {
    this.notes = [];
  }

  remove({ id }) {
    this.notes = this.notes.filter((note) => note.id !== id);
  }

  update(note) {
    this.notes = this.notes.map((n) => (n.id === note.id ? note : n));
  }

  setEditedNoteId(id) {
    this.editedNoteId = id;
  }

  saveStorage() {
    window.localStorage.setItem(
      this.localStorageKey + "_notes",
      JSON.stringify(this.notes),
    );
    window.localStorage.setItem(
      this.localStorageKey + "_editedNoteId",
      this.editedNoteId,
    );
    this.dispatchEvent(new CustomEvent("save"));
  }

  #readStorage() {
    this.notes = JSON.parse(
      window.localStorage.getItem(this.localStorageKey + "_notes") || "[]",
    );
    this.editedNoteId =
      window.localStorage.getItem(this.localStorageKey + "_editedNoteId") ||
      "none";
  }
}
