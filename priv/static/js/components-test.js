import { test, assert } from "./test-utils.js";
import "./components.js";

test("editable-area renders", async (container) => {
  container.innerHTML = `<editable-area>Test 123</editable-area>`;

  const textarea = container.querySelector("textarea");
  const display = container.querySelector("p");

  await assert(() => textarea.value === "Test 123");
  await assert(() => display.classList.contains("display"));
  await assert(() => display.innerHTML === "Test 123<br>");
});

test("editable-area updates on input", async (container) => {
  container.innerHTML = `<editable-area></editable-area>`;

  const textarea = container.querySelector("textarea");
  const display = container.querySelector("p");

  let eventCalled = false;
  container.addEventListener("contentChange", () => {
    eventCalled = true;
  });

  textarea.value = "Some new content\nwith a newline";
  textarea.dispatchEvent(
    new Event("input", { bubbles: true, cancelable: true }),
  );

  await assert(() => display.innerHTML === `Some new content<br>with a newline<br>`);
  await assert(() => eventCalled === true);
});

test("editable-area respects readonly attribute", async (container) => {
  container.innerHTML = `<editable-area readonly>Some text</editable-area>`;

  const textarea = container.querySelector("textarea");

  await assert(() => textarea.disabled);
});
