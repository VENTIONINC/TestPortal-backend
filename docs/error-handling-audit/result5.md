Result 5: middleware

Checked:

- [src/middleware/apiKeyMiddleware.ts](src/middleware/apiKeyMiddleware.ts)
- [src/middleware/authMiddleware.ts](src/middleware/authMiddleware.ts)
- [src/middleware/fileUploadMiddleware.ts](src/middleware/fileUploadMiddleware.ts)

Findings:

- `authMiddleware` and `apiKeyMiddleware` wrap logic in `try/catch` and return 401 on failures (no unhandled errors). [authMiddleware](src/middleware/authMiddleware.ts#L15-L41), [apiKeyMiddleware](src/middleware/apiKeyMiddleware.ts#L12-L37)
- `fileUploadMiddleware` uses multer fileFilter to error on non-JSON; errors are thrown via callback (Express default handles). No explicit error mapping middleware for multer errors. [fileUploadMiddleware](src/middleware/fileUploadMiddleware.ts#L6-L27)
	- Status: Fixed (explicit upload error handler + wired on routes). [src/middleware/fileUploadMiddleware.ts](src/middleware/fileUploadMiddleware.ts)
