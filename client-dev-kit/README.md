# PersonalEA Client Development Kit

This kit provides everything you need to start developing clients for the PersonalEA API services.

## Quick Start

1. **Start Mock Servers**
   ```bash
   cd ..
   npm run mock:docker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Examples**
   ```bash
   npm run examples
   ```

## What's Included

- **TypeScript Types**: Generated from OpenAPI specifications
- **API Client**: Pre-configured HTTP client with authentication
- **Example Code**: Working examples for all services
- **Mock Data**: Realistic test data for development
- **Testing Utilities**: Helpers for testing API integrations

## API Services

### Email Processing Service
- **Base URL**: http://localhost:8083
- **Features**: Email sync, AI analysis, action items, digests

### Goal & Strategy Service  
- **Base URL**: http://localhost:8085
- **Features**: Goal management, progress tracking, context analysis

### Calendar Service
- **Base URL**: http://localhost:8086
- **Features**: Event management, availability checking, smart scheduling

## File Structure

```
client-dev-kit/
├── src/
│   ├── types/           # Generated TypeScript types
│   ├── clients/         # API client implementations
│   ├── examples/        # Working code examples
│   └── utils/           # Helper utilities
├── tests/               # Test examples
└── docs/                # Additional documentation
```

## Authentication

All examples use a development JWT token. In production, implement proper OAuth2/JWT authentication.

```typescript
const token = "dev-token-for-testing";
```

## Error Handling

All API clients include comprehensive error handling:

```typescript
try {
  const emails = await emailClient.getEmails();
  console.log('Emails:', emails);
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Authentication failed');
  } else {
    console.error('API Error:', error.message);
  }
}
```

## Next Steps

1. Review the example code in `src/examples/`
2. Explore the TypeScript types in `src/types/`
3. Build your application using the provided clients
4. Test against mock servers before production deployment