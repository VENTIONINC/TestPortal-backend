interface ParsedError {
  type: string;
  message: string;
  callLog: string[];
  callStack: string[];
  testAssertion: string;
  expectedPattern: string;
  receivedString: string;
  location: {
    file: string;
    line: number;
  };
}

interface ErrorInput {
  message: string;
  stack: string;
  location: {
    file: string;
    line: number;
  };
}

export function toClearString(text = ""): string {
  const ansi =
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/gm; // eslint-disable-line no-control-regex

  return text.replace(ansi, "");
}

export function parseStackTrace(error: ErrorInput): ParsedError {
  const parsedError: ParsedError = {
    type: "",
    message: "",
    callLog: [],
    callStack: [],
    testAssertion: " ",
    expectedPattern: " ",
    receivedString: " ",
    location: { file: "", line: 0 },
  };

  let [type, ...rest] = error.message.split(":");

  if (!rest?.length) {
    // on timedOut status, there is no stack and error type
    type = "Error";
    rest = [error.message];
  }

  if (error.location) {
    parsedError.location = error.location;
  }

  const splitResult = toClearString(rest.join(":").trim())
    .split("\n")
    .filter(Boolean);

  const message = splitResult.length > 0 ? (splitResult[0] ?? "") : "";
  const callLog = splitResult.slice(1);

  parsedError.type = type ?? "";
  parsedError.message = message;
  parsedError.callLog = callLog;

  if (error.stack) {
    const lines = error.stack.trim().split("\n");

    lines.forEach((line, index) => {
      if (index === 0) {
        // const [type, ...rest] = line.split(':');
        // parsedError.type = type.trim();
        // parsedError.message = rest.join(':').trim();
      } else if (line.startsWith("Call log:")) {
        // parsedData.callLog = lines.slice(lines.indexOf(line) + 1).join('\n');
      } else if (line.includes("expect(")) {
        parsedError.testAssertion = toClearString(line.trim());
      } else if (line.startsWith("Expected pattern: ")) {
        parsedError.expectedPattern = toClearString(
          line.split("Expected pattern: ")[1]?.trim() ?? "",
        );
      } else if (line.startsWith("Received string: ")) {
        parsedError.receivedString = toClearString(
          line.split("Received string: ")[1]?.trim() ?? "",
        );
      } else if (line.trim().startsWith("at")) {
        // Function call stack line
        parsedError.callStack.push(toClearString(line));
      }
    });
  }

  parsedError.callStack = parsedError.callStack
    .map((el) => el.replaceAll(/[+-]/g, "").trim())
    .filter((el) => !!el);

  return parsedError;
}
