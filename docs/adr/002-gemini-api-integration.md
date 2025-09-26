# ADR-002: Gemini API Integration Architecture

**Status**: Accepted
**Date**: 2025-01-26
**Deciders**: Project team

## Context

The email-agent system requires an AI language model to classify emails into appropriate labels and understand email content for automated triage. The system needed:
- High-quality text understanding and classification capabilities
- Cost-effective API pricing for email processing workloads
- Reliable availability and performance
- Integration with Google Apps Script environment
- Support for both API key and OAuth authentication methods

Recent developments showed the system has been upgraded to use the latest Gemini models (gemini-2.5-flash and gemini-2.5-pro), indicating active evolution of the AI integration strategy.

## Decision

We chose Google's Generative Language API (Gemini) as the primary AI provider with dual authentication support:

1. **Primary Integration**: Generative Language API using API key authentication
   - Uses `gemini-2.5-flash` model for fast classification tasks
   - Uses `gemini-2.5-pro` model for complex analysis when needed
   - Simple API key authentication for ease of setup

2. **Secondary Integration**: Vertex AI using OAuth authentication
   - Provides enterprise-grade access to the same models
   - Uses OAuth for enhanced security in enterprise environments
   - Fallback option when API key method is not suitable

## Alternatives Considered

### Alternative 1: OpenAI GPT API
- **Pros**: Mature ecosystem, excellent documentation, proven performance
- **Cons**: Requires external API management, higher cost, no direct Google integration
- **Why not chosen**: Cost considerations and desire for tighter Google ecosystem integration

### Alternative 2: Claude API (Anthropic)
- **Pros**: Strong performance, good reasoning capabilities, safety-focused
- **Cons**: More expensive, requires external integration, limited Apps Script support
- **Why not chosen**: Higher cost and integration complexity

### Alternative 3: Local/Self-hosted Models
- **Pros**: Full control, no external API costs, data privacy
- **Cons**: Requires significant infrastructure, Apps Script cannot host models
- **Why not chosen**: Incompatible with Apps Script platform choice

### Alternative 4: Google Cloud Natural Language API
- **Pros**: Native Google integration, good classification capabilities
- **Cons**: Limited flexibility, not designed for conversational understanding
- **Why not chosen**: Insufficient capabilities for complex email understanding tasks

## Consequences

### Positive
- **Seamless Google integration**: Native support in Apps Script environment
- **Cost effectiveness**: Competitive pricing for text classification workloads
- **Dual authentication support**: Flexibility for different deployment scenarios
- **Latest model access**: Access to cutting-edge Gemini 2.5 models
- **Consistent API**: Unified interface across both authentication methods
- **Enterprise readiness**: OAuth option provides enterprise-grade security

### Negative
- **Vendor lock-in**: Tied to Google's AI platform and pricing
- **Model limitations**: Subject to Gemini model capabilities and restrictions
- **API dependencies**: Relies on external API availability and rate limits
- **Cost scaling**: Costs increase with email volume and API usage

### Neutral
- **Model versioning**: Need to manage model updates and compatibility
- **Rate limiting**: Must implement proper request batching and retry logic
- **Error handling**: Requires robust fallback mechanisms for API failures

## Implementation Notes

### Authentication Configuration
- Support both API key and OAuth methods through configuration
- Store credentials securely in PropertiesService
- Implement automatic fallback between authentication methods

### Model Selection Strategy
- Use `gemini-2.5-flash` for routine classification tasks (faster, cheaper)
- Use `gemini-2.5-pro` for complex analysis requiring deeper reasoning
- Implement model selection based on task complexity

### API Integration Pattern
```javascript
// Dual provider support with fallback
const providers = [
  new GenerativeLanguageProvider(apiKey),
  new VertexAIProvider(oauth)
];
```

### Error Handling
- Implement exponential backoff for rate limiting
- Graceful degradation when AI services are unavailable
- Logging and monitoring for API performance

## References

- [Generative Language API Documentation](https://developers.google.com/generative-ai)
- [Vertex AI Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Apps Script External API Guidelines](https://developers.google.com/apps-script/guides/services/external)