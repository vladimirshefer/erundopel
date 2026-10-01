### Modules

#### Frontend
- Client, available in browser for end users.
- Uses React, Typescript, React Router, React Query, Tailwind.
- Every page (separate route) should be in `pages/{name}Page.tsx` file. That is a naming convention.
- All client-server communication should be encapsulated in a Repository interface+class. Namin convention - `repositories/{EntityName}Repository.ts`. Each repository is managing its own entity type - "Lobby", "Answer", "Player", etc. Repository is an interface with clear CRUD operations at first. Each repository has the `{EntityName}RepositoryImpl` class implementing the interface. All the http/websocket communications is encapsulated there.

#### Backend
- Generic Backend Node.js implementation of the backend for deployments as Docker container.
- Should remain as thin as possible, proxying as much as possible directly from Frontend to Core.

#### Cloudflare
- Backend Implementation for Cloudflare Durable Objects. Alternative to classic backend. Used as main production deployment.
- Should remain as thin as possible, proxying as much as possible directly from Frontend to Core.

#### Core
- Game state management, lobby, players, tasks, game progression management.
- Any actions taken by user are encapsulated in a Controller interface+class (matching the Repository in Frontend module). Namin convention - `controllers/{EntityName}Controller.ts`. Each repository is managing its own entity type - "Lobby", "Answer", "Player", etc. Repository is an interface with clear CRUD operations at first. Each repository has the `{EntityName}ControllerImpl` class implementing the interface. All the http/websocket communications is encapsulated there.

### AI-Agents rules
- Do not create "helper" functions until explicitly asked to.
- Avoid excessive if-checks in code.
- Do now write stub implementations, use TODO in code. It is ok to have non-working code by the end of the iteration. We will fix that in later iterations.
- Follow the existing code conventions.
- 
