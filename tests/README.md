# Tests

This directory will contain all test files for the Unicorn Weather Index project.

## Testing Strategy

The project uses a dual testing approach:

### Unit Tests
- Specific examples demonstrating correct behavior
- Edge cases and error conditions
- Integration points between components

### Property-Based Tests
- Universal properties verified across all valid inputs
- Uses fast-check library for JavaScript
- Minimum 100 iterations per property test
- Each test tagged with format: **Feature: unicorn-weather-index, Property {number}: {property_text}**

## Test Structure

```
tests/
├── unit/           # Unit tests for individual components
├── property/       # Property-based tests
├── integration/    # Integration tests
└── fixtures/       # Test data and mock responses
```

## Running Tests

Test commands will be added as the testing framework is set up in subsequent tasks.