# Clothing photo analysis

Selecting a permitted clothing photo on `/wardrobe/upload` automatically calls the authenticated backend `/api/v1/wardrobe/analyze-image` endpoint. After server-side file validation, the backend sends the image to the vision provider. It validates the returned name, description, category, colors, seasons, occasions, and styles against a strict schema, and the form fills these values for review. Fabric and other optional attributes are omitted when they cannot be inferred reliably. Occasion, season and aesthetic are styling suggestions; they are not verified properties of a garment. A full-outfit photo is interpreted as its most prominent garment because one upload creates one clothing item.

The backend supports **Google Gemini** and **OpenAI**. There is no application-supplied shared API key. Select the provider explicitly in the Git-ignored **apps/server/.env**, then restart the backend. For Gemini:

```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_API_KEY=<your Google AI Studio API key>
```

Gemini uses Google's native `generateContent` API at `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. It reuses the clothing, outfit, inspiration and chat prompts and strict Zod validation, with provider/model labels identifying Gemini. Validated image bytes become native inline image parts; conversation roles are mapped to the native format. The key is sent in a server-only header. `OPENAI_BASE_URL` does not affect Gemini requests. There is no automatic fallback to another provider when the selected provider's key is missing. The model can be changed with `GEMINI_MODEL` to a compatible vision model your account can access. See [Google's native content API](https://ai.google.dev/api/generate-content) and [model documentation](https://ai.google.dev/gemini-api/docs/models).

For OpenAI:

```env
AI_PROVIDER=openai
AI_VISION_MODEL=gpt-4o
OPENAI_API_KEY=<your OpenAI API key>
```

Keep the key on the backend. Never place it in `NEXT_PUBLIC_*`, frontend source, logs, screenshots, or chat. The local provider is set to Gemini. On 2026-11-18 the supplied key successfully called the real Google API using `gemini-3.5-flash-lite`. A synthetic blue T-shirt image returned a validated name, description, category, color, seasons, occasions and styles; material was omitted. This verifies configuration and the provider's analysis path, not the accuracy of arbitrary wardrobe photos, a complete browser upload journey, or permanent image persistence. There is no automatic fake-success fallback. `AI_PROVIDER=mock` is an explicitly selected development demo only.

Brand and Silhouette inputs have been removed from upload and item-detail editing, and their metadata tiles are hidden. Existing stored data is retained. The remaining form fields can be corrected before saving; image analysis does not silently save the item. A fresh photo clears prior suggestions, and late results from a removed photo cannot populate another upload. Retry remains available after analysis errors.

Analysis failure follow-up (2026-11-23): two observed browser analysis requests returned HTTP 503, leaving fields blank with the retry message below the fold. A live reproduction observed a compatibility-API timeout and a 503 response. The native Gemini API returned a validated trousers name/category/description after one temporary 503 and a successful retry. Gemini now uses the native API, with at most two clothing-analysis attempts and a one-second delay before retrying only a timeout or temporary provider failure. Progress, failure and retry are shown above the upload form; fields are disabled while a scan is in progress. Provider outages can still occur and are never replaced with invented details. Tests cover native image serialization, chat roles/provider labels, authentication/rate-limit errors, strict output rejection, empty output, recovery after one 503, and stopping after repeated 503 responses.

Cloudinary display fix (2026-11-23): Next.js image optimization must allow the image delivery host independently of backend storage authentication. The frontend configuration now permits HTTPS `res.cloudinary.com` URLs with the `/*/image/upload/**` path, resolving the wardrobe card's unconfigured-host runtime error. After restarting the frontend, a disposable Cloudinary upload passed through the actual `/_next/image` endpoint with HTTP 200 and an image content type; the test asset was removed. The frontend production build, its type checking, lint, and existing test passed. Existing saved items do not need to be uploaded again for this display fix.

Saving permanent wardrobe photos separately requires Cloudinary storage credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Analysis sends validated bytes directly to the AI provider and does not require a temporary public storage upload. A preview or completed analysis is not proof that the image has been saved.

Cloudinary credential troubleshooting: the earlier HTTP 401 `api_secret mismatch` was resolved on 2026-11-23 after replacing the key/secret pair and restarting the backend. Live authentication passed, the application's signed upload function stored a disposable PNG, its HTTPS image URL returned HTTP 200 with an image content type, and the test asset was deleted successfully. This verifies the storage integration; a real user's complete browser save and database persistence journey still needs separate verification. The Cloud Name, API Key and API Secret must be copied as a matching set from one Cloudinary product environment/key. Save the backend `.env` and restart the API after corrections. Do not paste credentials into chat. Upload authentication/permission errors return the safe `STORAGE_AUTH_FAILED` error; provider messages, signatures and secrets are not exposed.

Provider tests cover a complete name/description result, rejection of unexpected ownership fields, unsupported categories and labels, missing name/description, and provider failures. Old cache entries without the new required fields fail validation and are reanalyzed rather than returning incomplete suggestions. Live Gemini synthetic-image analysis and Cloudinary upload/retrieval/cleanup tests passed as described above. Real-photo browser testing and database persistence after a browser save still need separate verification.
