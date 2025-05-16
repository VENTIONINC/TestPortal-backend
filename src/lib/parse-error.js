
export function toClearString(text = '') {
    const ansi = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/gm;

    return text.replace(ansi, '');
}

export function parseStackTrace(error) {
    const parsedError = {
        type: '',
        message: '',
        callLog: [],
        callStack: [],
        testAssertion: ' ',
        expectedPattern: ' ',
        receivedString: ' ',
        location: error.location
    };

    let [type, ...rest] = error.message.split(':');

    if (!rest || !rest.length) {
        // on timedOut status, there is no stack and error type
        type = 'Error';
        rest = [error.message];
    }

    const [message, ...callLog] = toClearString(rest.join(':').trim()).split('\n').filter(Boolean);

    parsedError.type = type;
    parsedError.message = message;
    parsedError.callLog = callLog;

    if (error) {
        const lines = error.stack.trim().split('\n');

        lines.forEach((line, index) => {
            if (index === 0) {
                // const [type, ...rest] = line.split(':');
                // parsedError.type = type.trim();
                // parsedError.message = rest.join(':').trim();
            } else if (line.startsWith('Call log:')) {
                // parsedData.callLog = lines.slice(lines.indexOf(line) + 1).join('\n');
            } else if (line.includes('expect(')) {
                parsedError.testAssertion = toClearString(line.trim());
            } else if (line.startsWith('Expected pattern: ')) {
                parsedError.expectedPattern = toClearString(line.split('Expected pattern: ')[1].trim());
            } else if (line.startsWith('Received string: ')) {
                parsedError.receivedString = toClearString(line.split('Received string: ')[1].trim());
            } else if (line.trim().startsWith('at')) {
                // Function call stack line
                parsedError.callStack.push(toClearString(line));
            }
        });
    }

    parsedError.callStack = parsedError.callStack
        .map((el) => el.replaceAll(/[+\-]/g, '').trim())
        .filter((el) => !!el);

    return parsedError;
}