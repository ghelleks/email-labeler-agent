# ADR-006: Dual Authentication Model (API Key vs OAuth)

**Status**: Accepted
**Date**: 2025-01-26
**Deciders**: Project team

## Context

The email-agent system needed to integrate with Google's Generative AI services, which are available through two different APIs with different authentication mechanisms:

**Generative Language API:**
- Uses API key authentication
- Simpler setup process for individual users
- Direct access without OAuth complexity
- Good for personal and small-scale deployments

**Vertex AI API:**
- Uses OAuth 2.0 authentication
- Enterprise-grade security model
- Better for organizational deployments
- More complex setup but enhanced security controls

The system needed to support both authentication methods to accommodate different user environments, security requirements, and organizational policies while maintaining a consistent user experience.

## Decision

We implemented a dual authentication architecture that supports both API key and OAuth authentication methods:

**Primary Method: Generative Language API with API Key**
- Default authentication method for simplicity
- Users provide API key through configuration
- Simpler setup process for individual users
- Direct integration with Apps Script environment

**Secondary Method: Vertex AI with OAuth**
- Enterprise-focused authentication option
- OAuth 2.0 flow for enhanced security
- Better compliance with organizational security policies
- Fallback option when API key method is not suitable

**Unified Interface:**
- Both authentication methods provide access to the same Gemini models
- Consistent API interface regardless of authentication method
- Automatic fallback between methods based on configuration
- Transparent switching based on availability and user preference

## Alternatives Considered

### Alternative 1: API Key Only
- **Pros**: Simple implementation, easy user setup, minimal complexity
- **Cons**: Limited enterprise adoption, security concerns for organizations
- **Why not chosen**: Excludes enterprise users with OAuth requirements

### Alternative 2: OAuth Only
- **Pros**: Enhanced security, enterprise-ready, standardized authentication
- **Cons**: Complex setup for individual users, higher barrier to entry
- **Why not chosen**: Too complex for personal use cases

### Alternative 3: Service Account Authentication
- **Pros**: Suitable for automated systems, good security model
- **Cons**: Complex credential management, not suitable for user-specific access
- **Why not chosen**: Doesn't match the user-centric nature of email processing

### Alternative 4: Third-Party Authentication Service
- **Pros**: Unified authentication, professional identity management
- **Cons**: Additional dependency, cost implications, integration complexity
- **Why not chosen**: Adds unnecessary complexity for Google services integration

### Alternative 5: Dynamic Authentication Selection
- **Pros**: Automatically chooses best method, optimizes for each user
- **Cons**: Complex decision logic, unpredictable behavior, testing complexity
- **Why not chosen**: User should control authentication method explicitly

## Consequences

### Positive
- **Deployment flexibility**: Supports both individual and enterprise use cases
- **Security options**: Users can choose appropriate security level
- **Enterprise adoption**: OAuth support enables organizational deployments
- **Migration path**: Users can switch authentication methods as needs change
- **Consistent experience**: Same functionality regardless of authentication method

### Negative
- **Implementation complexity**: Need to maintain two authentication pathways
- **Testing overhead**: Must test both authentication methods thoroughly
- **Configuration complexity**: Users need to understand which method to choose
- **Documentation burden**: Need clear guidance for both authentication types

### Neutral
- **Code maintenance**: Requires ongoing support for both authentication methods
- **Error handling**: Different error patterns between authentication methods
- **Performance differences**: Minor variations in API response patterns

## Implementation Notes

### Authentication Provider Pattern
```javascript
// Abstract authentication interface
class AuthProvider {
  async authenticate() { /* implementation specific */ }
  async makeRequest(endpoint, data) { /* authenticated request */ }
  isConfigured() { /* check if credentials are available */ }
}

// Concrete implementations
class ApiKeyProvider extends AuthProvider { /* ... */ }
class OAuthProvider extends AuthProvider { /* ... */ }
```

### Configuration Management
- Store API keys securely in PropertiesService
- Handle OAuth tokens with proper refresh logic
- Provide clear configuration instructions for both methods
- Validate credentials during setup

### Fallback Strategy
- Primary: Try configured authentication method first
- Fallback: Attempt alternative method if primary fails
- Error reporting: Clear messaging about authentication issues
- Recovery: Guidance for fixing authentication problems

### Security Considerations
- API keys: Secure storage, rotation guidance, access logging
- OAuth tokens: Proper refresh handling, scope management, token storage
- Error handling: Avoid exposing credentials in logs or error messages
- Access patterns: Monitor for unusual authentication patterns

### Migration Support
- Easy switching between authentication methods
- Credential migration utilities
- Validation tools for new authentication setups
- Documentation for authentication method selection

## References

- [Generative Language API Authentication](https://developers.google.com/generative-ai/docs/api_key)
- [Vertex AI Authentication](https://cloud.google.com/vertex-ai/docs/authentication)
- [Apps Script OAuth Best Practices](https://developers.google.com/apps-script/guides/services/authorization)