"use strict";

/* ==========================================================================
   Calculator — Oasis Infobyte Level 2
   No eval(): every operation is computed explicitly in compute().
   × and ÷ are done before + and − (5 + 3 × 2 = 11).
   ========================================================================== */

const MAX_DIGITS = 12;
const OPERATOR_SYMBOLS = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" };
const HIGH_PRIORITY_OPERATORS = ["*", "/"];

const resultElement = document.getElementById("result");
const expressionElement = document.getElementById("expression");

/* State ------------------------------------------------------------------ */
let currentValue;     // number being typed, or the last result (string)
let previousValue;    // first operand once an operator is chosen (string or null)
let operator;         // "+", "-", "*", "/" or null
let pendingValue;     // deferred "+" or "-" waiting for a "×" or "÷" to finish
let pendingOperator;  // e.g. in 5 + 3 × 2, "5 +" is kept here while 3 × 2 is computed
let overwrite;        // true: the next digit starts a new number
let lastOperator;     // remembered so that pressing "=" again repeats the operation
let lastOperand;
let expression;       // small line shown above the result
let hasError;

/* Display ---------------------------------------------------------------- */
function displayResult() {
  resultElement.textContent = currentValue;
  resultElement.classList.remove("is-error");
  expressionElement.textContent = expression;
}

function displayError(message) {
  clearCalculator();
  hasError = true;
  resultElement.textContent = message;
  resultElement.classList.add("is-error");
}

/* Calculation ------------------------------------------------------------ */
function compute(a, b, op) {
  const x = parseFloat(a);
  const y = parseFloat(b);
  let result;

  switch (op) {
    case "+":
      result = x + y;
      break;
    case "-":
      result = x - y;
      break;
    case "*":
      result = x * y;
      break;
    case "/":
      if (y === 0) {
        throw new Error("Cannot divide by zero");
      }
      result = x / y;
      break;
    default:
      throw new Error("Unknown operator");
  }

  if (!Number.isFinite(result)) {
    throw new Error("Result is too large");
  }

  // Rounding to 12 significant digits turns 0.1 + 0.2 into 0.3
  return String(Number(result.toPrecision(MAX_DIGITS)));
}

// Runs compute() and shows an error message instead of crashing
function runOperation(a, b, op) {
  try {
    return compute(a, b, op);
  } catch (error) {
    displayError(error.message);
    return null;
  }
}

function isHighPriority(op) {
  return HIGH_PRIORITY_OPERATORS.includes(op);
}

// Completes the deferred "+" or "-" with a value: 5 + (3 × 2) -> 5 + 6
function flushPending(value) {
  if (pendingOperator === null) {
    return value;
  }
  const total = runOperation(pendingValue, value, pendingOperator);
  pendingValue = null;
  pendingOperator = null;
  return total;
}

function pendingText() {
  return pendingOperator === null ? "" : `${pendingValue} ${OPERATOR_SYMBOLS[pendingOperator]} `;
}

function buildExpression() {
  return `${pendingText()}${previousValue} ${OPERATOR_SYMBOLS[operator]}`;
}

/* Input handlers --------------------------------------------------------- */
function startNewNumber(value) {
  if (operator === null) {
    // New calculation after a result: forget the repeated operation
    lastOperator = null;
    expression = "";
  }
  currentValue = value;
  overwrite = false;
}

function handleNumber(digit) {
  if (hasError) {
    clearCalculator();
  }

  if (overwrite) {
    startNewNumber(digit);
  } else if (currentValue === "0") {
    currentValue = digit;
  } else if (currentValue.replace(/\D/g, "").length < MAX_DIGITS) {
    currentValue += digit;
  }
  displayResult();
}

function handleDecimal() {
  if (hasError) {
    clearCalculator();
  }

  if (overwrite) {
    startNewNumber("0.");
  } else if (!currentValue.includes(".")) {
    currentValue += ".";
  }
  displayResult();
}

function handleOperator(newOperator) {
  if (hasError) {
    return;
  }

  // Two operators in a row: the last one wins
  if (operator !== null && overwrite) {
    if (pendingOperator !== null && !isHighPriority(newOperator)) {
      // 5 + 3 × then "+": the deferred 5 + 3 can now be completed
      const total = flushPending(previousValue);
      if (total === null) {
        return;
      }
      previousValue = total;
      currentValue = total;
    }
    operator = newOperator;
    expression = buildExpression();
    displayResult();
    return;
  }

  if (operator === null) {
    previousValue = String(parseFloat(currentValue));
  } else if (!isHighPriority(operator) && isHighPriority(newOperator)) {
    // 5 + 3 then "×": the multiplication goes first, so keep "5 +" for later
    pendingValue = previousValue;
    pendingOperator = operator;
    previousValue = String(parseFloat(currentValue));
  } else {
    let result = runOperation(previousValue, currentValue, operator);
    if (result !== null && !isHighPriority(newOperator)) {
      result = flushPending(result);
    }
    if (result === null) {
      return;
    }
    previousValue = result;
    currentValue = result;
  }

  operator = newOperator;
  lastOperator = null;
  overwrite = true;
  expression = buildExpression();
  displayResult();
}

function calculate() {
  if (hasError) {
    return;
  }

  let firstOperand;
  let secondOperand;
  let operation;

  if (operator !== null) {
    firstOperand = previousValue;
    secondOperand = currentValue;
    operation = operator;
  } else if (lastOperator !== null) {
    // "=" pressed again: repeat the last operation
    firstOperand = currentValue;
    secondOperand = lastOperand;
    operation = lastOperator;
  } else {
    return;
  }

  const result = runOperation(firstOperand, secondOperand, operation);
  if (result === null) {
    return;
  }

  expression = `${pendingText()}${String(parseFloat(firstOperand))} ${OPERATOR_SYMBOLS[operation]} ${String(parseFloat(secondOperand))} =`;
  const total = flushPending(result);
  if (total === null) {
    return;
  }

  lastOperator = operation;
  lastOperand = secondOperand;
  currentValue = total;
  previousValue = null;
  operator = null;
  overwrite = true;
  displayResult();
}

function deleteLastCharacter() {
  if (hasError || overwrite) {
    return;
  }

  currentValue = currentValue.slice(0, -1);
  if (currentValue === "" || currentValue === "-") {
    currentValue = "0";
  }
  displayResult();
}

function clearCalculator() {
  currentValue = "0";
  previousValue = null;
  operator = null;
  pendingValue = null;
  pendingOperator = null;
  overwrite = false;
  lastOperator = null;
  lastOperand = null;
  expression = "";
  hasError = false;
  displayResult();
}

/* Keyboard --------------------------------------------------------------- */
function handleKeyboard(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const key = event.key;

  if (key >= "0" && key <= "9") {
    handleNumber(key);
  } else if (key === "." || key === ",") {
    handleDecimal();
  } else if (key in OPERATOR_SYMBOLS) {
    event.preventDefault(); // "/" opens quick find in some browsers
    handleOperator(key);
  } else if (key === "Enter" || key === "=") {
    event.preventDefault(); // avoids a second click on a focused button
    calculate();
  } else if (key === "Backspace") {
    deleteLastCharacter();
  } else if (key === "Escape") {
    clearCalculator();
  }
}

/* Events ----------------------------------------------------------------- */
const actions = {
  clear: clearCalculator,
  backspace: deleteLastCharacter,
  equals: calculate,
  decimal: handleDecimal
};

document.querySelectorAll("[data-digit]").forEach((button) => {
  button.addEventListener("click", () => handleNumber(button.dataset.digit));
});

document.querySelectorAll("[data-operator]").forEach((button) => {
  button.addEventListener("click", () => handleOperator(button.dataset.operator));
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => actions[button.dataset.action]());
});

document.addEventListener("keydown", handleKeyboard);

clearCalculator();
