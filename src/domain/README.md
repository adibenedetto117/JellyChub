# Domain Layer

This layer provides a resilient API abstraction. When external APIs change, you update files here instead of throughout the codebase.

## Structure

```
domain/
├── models/        # App-level types (stable interface)
├── schemas/       # Zod validation (catches API changes)
├── adapters/      # Transform raw API -> app models
├── services/      # High-level operations
└── errors/        # Centralized error handling
```

## Services

| Service | Provider | What it does |
|---------|----------|--------------|
| `MediaService` | Jellyfin | Media items, search, resume, episodes |
| `LibraryService` | Jellyfin | Libraries, genres |
| `JellyseerrService` | Jellyseerr | Requests, discover, trending |
| `SonarrService` | Sonarr | TV series management, queue |
| `RadarrService` | Radarr | Movie management, queue |
| `OpenSubtitlesService` | OpenSubtitles | Subtitle search, download |

## When to Update What

### API field renamed or removed
Update the **adapter** to map the new field name:
```typescript
// adapters/jellyfin/media.adapter.ts
return {
  title: raw.Name,        // was: raw.Title
  year: raw.ProductionYear,
};
```

### API adds new required field
Update the **schema** to include it:
```typescript
// schemas/jellyfin/baseItem.schema.ts
export const BaseItemSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  NewField: z.string(),  // add new field
});
```

### API endpoint changes
Update the raw API layer:
```typescript
// api/library.ts (not domain layer)
const response = await client.get('/new/endpoint');
```

### Adding a new operation
Update the **service**:
```typescript
// services/MediaService.ts
async getNewThing(): Promise<MediaItem[]> {
  const raw = await apiCall();
  const validated = Schema.parse(raw);
  return adaptItems(validated);
}
```

## Adding a New Provider

1. **Create model** in `models/` (or reuse existing)
2. **Create schema** in `schemas/newprovider/`
3. **Create adapter** in `adapters/newprovider/`
4. **Create service** in `services/`
5. **Export** from index files

Example structure:
```
schemas/newprovider/
├── something.schema.ts
└── index.ts

adapters/newprovider/
├── something.adapter.ts
└── index.ts

services/
└── NewProviderService.ts
```

## Patterns

### Schema with passthrough
Always use `.passthrough()` so new API fields don't break validation:
```typescript
export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough();  // allows extra fields
```

### Adapter function
Transform raw validated data to app model:
```typescript
export function adaptItem(raw: ValidatedItem): AppItem {
  return {
    id: raw.Id,
    title: raw.Name,
    // ... map all fields
  };
}
```

### Service method
Validate, adapt, handle errors:
```typescript
async getItem(id: string): Promise<AppItem> {
  try {
    const raw = await rawApiCall(id);
    const validated = ItemSchema.parse(raw);
    return adaptItem(validated);
  } catch (error) {
    throw handleApiError(error, {
      provider: 'providername',
      operation: 'getItem',
    });
  }
}
```

## Error Handling

All errors go through `handleApiError()` which wraps them in typed errors:
- `ApiError` - General API errors
- `ValidationError` - Schema validation failed (API changed?)
- `NetworkError` - Connection issues

## Usage in Components

```typescript
import { MediaService, JellyseerrService } from '@/domain';

// Create service
const mediaService = new MediaService({
  userId: user.id,
  serverId: server.id,
  baseUrl: server.url,
});

// Use it
const items = await mediaService.getResumeItems();
const requests = await jellyseerrService.getRequests();
```
