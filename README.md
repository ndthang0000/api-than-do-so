# Thần Dò Số · API

Thần Dò Số is a NestJS backend for looking up Vietnamese lottery results and checking and saving tickets. The companion [React Native app](https://github.com/ndthang0000/app-than-do-so) provides the ticket and result screens. The API uses TypeScript, MongoDB via Mongoose, Redis, and JWT authentication.

## API endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /api/lottery-results` | Look up draw results. |
| `POST /api/tickets/check-and-save` | Check a ticket and save it through the ticket workflow. |
| `GET /api/tickets/paginate` | List the signed-in user's tickets with pagination. |

For a walkthrough, start with the [ticket controller](src/%40api/controllers/ticket.controller.ts), follow the call into the [ticket service](src/%40api/services/ticket.service.ts), and see the stored tickets in the [mobile app's My Tickets screen](https://github.com/ndthang0000/app-than-do-so/blob/dev/app/screens/MyTicket.tsx). The [results controller](src/%40api/controllers/lottery-result.controller.ts) is the entry point for draw lookups.

## Run locally

Use Node.js 22 with npm, plus reachable MongoDB and Redis instances.

1. Install dependencies.

   ```sh
   npm ci
   ```

2. Copy [`env/example.env`](env/example.env) to `env/local.env` and use `NODE_ENV=local` or leave `NODE_ENV` unset. Set `MONGODB_URL`, `REDIS_HOST` and `REDIS_PORT` for your environment. Set local values for the JWT signing and refresh secrets. See [the runtime configuration](src/%40core/config/core.config.ts) for additional integration settings.
3. Start the development server.

   ```sh
   npm run start:dev
   ```

Swagger is available at `http://localhost:3000/docs` with the default port. Use it to inspect query parameters, request bodies and authentication for each route. Result lookups depend on the data available to the configured backend.

## Build and tests

```sh
npm run build
npm run test:e2e
```
