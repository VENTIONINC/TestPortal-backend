# AI configuration flow

```mermaid
flowchart TD
    A[Server startup] --> B{AI_CONFIG_PATH set and nonblank?}
    B -->|Yes| C[Load complete custom config file]
    B -->|No| D[Load shipped config/ai/server.json]
    C --> E[Validate config and credentials]
    D --> E
    E -->|Missing or invalid| F[Fail startup with clear error]
    E -->|Valid| G[Store config until restart]
    G --> H[Server accepts requests]
    H --> I[AI operation]
    I --> J[Resolve mapped profile and settings]
    J --> K[Call configured model]
    K -->|Success| L[Return result]
    K -->|Error or timeout| M[Existing operation error handling]
```

The shipped file owns the baseline settings. A custom file replaces it entirely,
without merging or falling back to another file or hardcoded settings. Missing
required generation settings or credentials fail startup. Omitted optional
temperature, reasoning, and timeout remain absent.

Evaluations independently select `AI_EVAL_CONFIG_PATH` or the shipped
`config/ai/evaluation.baseline.json`. Validated runner overrides take precedence
over the selected evaluation file.

The dashboard retains its existing eight-second deadline and runtime fallback.
