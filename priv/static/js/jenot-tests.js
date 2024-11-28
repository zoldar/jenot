import "./components.js";

const URL_PARAMS = new URLSearchParams(window.location.search);

const CONCRETE_TEST = URL_PARAMS.get("t");

let counter = 1;

const body = document.querySelector("body");
const log = document.querySelector("#test-log");

class AssertError extends Error {
  constructor(message, options) {
    super(message, options);
  }
}

const setup = (idx) => {
  const container = document.createElement("div", { id: `test-${idx}` });
  body.appendChild(container);
  return container;
};

async function assert(assertion, timeout) {
  timeout = timeout || 100;
  const interval = Math.max(timeout / 10, 10);
  const start = performance.now();
  let now = performance.now();

  while (true) {
    let result;
    let error;

    try {
      result = assertion();
    } catch (error) {
      result = false;
      error = error;
    }

    if (result === true) break;

    if (now - start >= timeout) {
      const assertionStr = assertion.toString();
      const opts = error ? { cause: error } : {};
      throw new AssertError(`Assertion failed: ${assertionStr}`, opts);
    }

    await new Promise((r) => setTimeout(r, interval));
    now = performance.now();
  }
}

function test(label, testFun) {
  if (CONCRETE_TEST && CONCRETE_TEST != counter) {
    counter++;
    return;
  }
  const container = setup(counter);
  const logRow = document.createElement("li");
  logRow.textContent = `[RUNNING] ${label}`;
  log.appendChild(logRow);

  try {
    testFun(container);
    const message = `[OK] ${label}`;
    console.info(message);
    logRow.textContent = message;
    logRow.classList.add("success");
  } catch (error) {
    const message = `[ERROR] ${label}`;
    console.error(message, error);
    logRow.textContent = message;
    logRow.classList.add("failure");
    const errorOutput = document.createElement("pre");
    errorOutput.textContent = `${error.name}: ${error.message}`;
    if (error.stack) {
      errorOutput.textContent += `\n${error.stack}`;
    }
    logRow.appendChild(errorOutput);
  }
  container.remove();
  counter++;
}

test("editable-area renders", (container) => {
  container.innerHTML = `<editable-area>Test 123</editable-area>`;

  const textarea = container.querySelector("textarea");
  const display = container.querySelector("p");

  assert(() => textarea.value === "Test 123");
  assert(() => display.classList.contains("display"));
  assert(() => display.innerHTML === "Test 123<br>");
});

test("editable-area updates on input", (container) => {
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

  assert(() => display.innerHTML === `Some new content<br>with a newline<br>`);
  assert(() => eventCalled === true);
});

test("editable-area respects readonly attribute", (container) => {
  container.innerHTML = `<editable-area readonly>Some text</editable-area>`;

  const textarea = container.querySelector("textarea");

  assert(() => textarea.disabled)
})
