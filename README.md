# Power Pickleball

This project is a Vue 3 + Vite front-end for the Power Pickleball game.

## WebsiteId / Multi-tenant Identification

This deployment is identified to the backend by a WebsiteId. For this instance the default is **2**.

The value is sent automatically on every API request as the `X-Website-Id` header.

Priority order when resolving the WebsiteId:
1. Value stored in `localStorage` under key `websiteId` (can be set at runtime via `setWebsiteId(<number>)`).
2. Environment variable `VITE_WEBSITE_ID` (e.g. set in a `.env` file or deployment configuration).
3. Fallback constant (2) baked into `src/api/client.js`.

### Overriding at Runtime
In the browser console you can switch the active WebsiteId for testing:
```js
import { setWebsiteId, getWebsiteId } from '/src/api/client.js';
setWebsiteId(5);
getWebsiteId(); // 5
```

Reload the page for the change to take effect across all requests. To clear override:
```js
localStorage.removeItem('websiteId');
```

### Adding to New Calls
Use `apiRequest('/path', { method: 'GET' })` as normal; the header is attached automatically. To explicitly skip sending it (rare):
```js
apiRequest('/public/info', { includeWebsiteId: false });
```

## Development
- `npm install`
- `npm run dev` to start the Vite dev server.
- `npm run server` to launch the websocket / API dev server if present in `server/`.

