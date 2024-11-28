let counter = 1;
let tests = [];

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

export async function assert(assertion, timeout) {
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

export function runTests(globalOptions) {
  tests.forEach(async ({ label, testFun, idx, options }) => {
    const logRow = document.createElement("li");

    if (globalOptions.only && globalOptions.only.indexOf(idx) < 0) {
      return;
    }

    if (options.skip) {
      const message = `[SKIPPED] ${label}`;
      logRow.textContent = message;
      log.appendChild(logRow);
      console.info(message);
    }

    const container = setup(idx);
    logRow.textContent = `[RUNNING] ${label}`;
    log.appendChild(logRow);

    try {
      await testFun(container, idx);
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
  });
}

export function test(label, testFun, options) {
  options = options || {};

  tests.push({
    label: label,
    testFun: testFun,
    idx: counter,
    options: options,
  });

  counter++;
}
