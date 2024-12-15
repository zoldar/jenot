import { test, assert } from "./test-utils.js";
import { SyncedNoteStore } from "./synced-store.js";

test("synced store stores a note", async (_container, idx) => {
  const store = new SyncedNoteStore(`jenot-app-test-${idx}`, "/", {
    add: () => null,
  });

  await store.add({ type: "note", content: "Test 123" });

  const notes = await store.all();

  await assert(() => notes.length === 1);
  await assert(() => notes[0].type === "note");
  await assert(() => notes[0].content === "Test 123");
  await assert(() => notes[0].id != null);
  await assert(() => Number.isInteger(notes[0].created));
  await assert(() => Number.isInteger(notes[0].updated));
  await assert(() => notes[0].deleted === null);

  indexedDB.deleteDatabase(`jenot-app-test-${idx}`);
});

test("synced store gets a note", async (_container, idx) => {
  let addCalled = false;

  const store = new SyncedNoteStore(`jenot-app-test-${idx}`, "/", {
    add: () => (addCalled = true),
  });

  await store.add({ type: "note", content: "Test 123" });

  const notes = await store.all();

  const retrievedNote = await store.get(notes[0].id);

  await assert(() => retrievedNote.id === notes[0].id);
  await assert(() => addCalled);

  indexedDB.deleteDatabase(`jenot-app-test-${idx}`);
});

test("synced store updates a note", async (_container, idx) => {
  let addCalled = false,
    updateCalled = false;

  const store = new SyncedNoteStore(`jenot-app-test-${idx}`, "/", {
    add: () => (addCalled = true),
    update: () => (updateCalled = true),
  });

  await store.add({ type: "note", content: "Test 123" });

  const [note] = await store.all();
  const addedNote = structuredClone(note);

  note.content = "New content";

  await store.update(note);

  const [updatedNote] = await store.all();

  await assert(() => addCalled);
  await assert(() => updateCalled);
  await assert(() => addedNote.id === updatedNote.id);
  await assert(() => updatedNote.content === "New content");
  await assert(() => updatedNote.updated > addedNote.updated);

  indexedDB.deleteDatabase(`jenot-app-test-${idx}`);
});
