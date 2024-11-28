import { runTests } from "./test-utils.js";

// tests to run
import "./components-test.js";

const URL_PARAMS = new URLSearchParams(window.location.search);
const CONCRETE_TEST = URL_PARAMS.get("t");

runTests({
  only: CONCRETE_TEST ? [parseInt(CONCRETE_TEST)] : null,
});
