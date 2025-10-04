/**
 * Todo Forwarder Agent - Self-Contained Implementation
 *
 * This agent implements automated forwarding for emails labeled "todo":
 * - Forwards todo emails to a configured email address
 * - Tracks forwarded emails to ensure idempotency
 * - Supports both immediate forwarding (onLabel) and inbox scanning (postLabel)
 * - Uses label transitions to mark emails as forwarded
 *
 * Dual-Hook Architecture:
 * 1. onLabel: Runs during classification (immediate forward for newly-classified emails)
 * 2. postLabel: Runs after all labeling (scans inbox for manually-labeled emails)
 *
 * Features:
 * - Self-contained: manages own config without core Config.gs changes
 * - Idempotent: tracks forwarded emails to prevent duplicates
 * - Thread-aware: forwards complete email threads with context
 * - Dual-mode: immediate + inbox scanning without separate trigger
 * - Full error handling and dry-run support
 */

// ============================================================================
// Configuration Management (Self-Contained)
// ============================================================================

/**
 * Get Todo Forwarder agent configuration with sensible defaults
 * Manages own PropertiesService keys without core Config.gs changes
 */
function getTodoForwarderConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    // Agent enablement
    TODO_FORWARDER_ENABLED: (props.getProperty('TODO_FORWARDER_ENABLED') || 'true').toLowerCase() === 'true',

    // Forwarding configuration
    TODO_FORWARDER_EMAIL: props.getProperty('TODO_FORWARDER_EMAIL'),

    // Label management
    TODO_FORWARDER_REMOVE_TODO_LABEL: (props.getProperty('TODO_FORWARDER_REMOVE_TODO_LABEL') || 'true').toLowerCase() === 'true',
    TODO_FORWARDER_ARCHIVE_AFTER_FORWARD: (props.getProperty('TODO_FORWARDER_ARCHIVE_AFTER_FORWARD') || 'false').toLowerCase() === 'true',

    // Debugging and testing
    TODO_FORWARDER_DEBUG: (props.getProperty('TODO_FORWARDER_DEBUG') || 'false').toLowerCase() === 'true',
    TODO_FORWARDER_DRY_RUN: (props.getProperty('TODO_FORWARDER_DRY_RUN') || 'false').toLowerCase() === 'true'
  };
}