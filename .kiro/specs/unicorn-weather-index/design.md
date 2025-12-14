# Design Document - Unicorn Weather Index

## Overview

The Unicorn Weather Index is a client-side web application that provides real-time productivity insights by comparing individual GitHub activity against aggregated data from major Bangalore tech unicorns, correlated with local weather patterns. The system uses vanilla JavaScript with Chart.js for visualization, implementing a responsive dark-mode dashboard optimized for hackathon demonstration.

## Architecture

### System Architecture
The application follows a client-side MVC pattern with three main layers:

1. **Data Layer**: Handles API interactions with GitHub, Open-Meteo weather service
2. **Processing Layer**: Normalizes, aggregates, and correlates data from multiple sources
3. **Presentation Layer**: Renders interactive visualizations and insights using Chart.js

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Visualization**: Chart.js for combo charts with dual y-axes
- **Layout**: CSS Grid for responsive design
- **APIs**: GitHub REST API v3, Open-Meteo Weather API
- **Styling**: Custom CSS with fintech dark theme

## Components and Interfaces

### Core Components

#### 1. DataFetcher
Manages all external API calls with rate limiting and error handling.
```javascript
class DataFetcher {
  async fetchOrgEvents(orgName)
  async fetchUserEvents(username)
  async fetchWeatherData(latitude, longitude, startDate, endDate)
}
```

#### 2. DataProcessor
Handles data normalization, aggregation, and correlation analysis.
```javascript
class DataProcessor {
  aggregateOrgData(orgDataArray)
  normalizeToActivityScore(rawData, maxValue)
  correlateWithWeather(activityData, weatherData)
  generateInsights(userData, baselineData, weatherData)
}
```

#### 3. ChartRenderer
Manages Chart.js visualization with dual y-axes configuration.
```javascript
class ChartRenderer {
  createComboChart(canvasElement, datasets, options)
  updateChart(newData)
  configureResponsiveOptions()
}
```

#### 4. InsightGenerator
Produces "David vs. Goliath" style insights and correlations.
```javascript
class InsightGenerator {
  calculateRelativePerformance(userData, baselineData)
  findWeatherCorrelations(activityData, weatherData)
  generatePersonalizedInsights(correlations)
}
```

### API Interfaces

#### GitHub API Integration
- **Endpoint**: `https://api.github.com/orgs/{org}/events`
- **Rate Limit**: 60 requests/hour (unauthenticated)
- **Data Filter**: PushEvents only
- **Organizations**: zerodha, razorpay, postmanlabs, hasura

#### Open-Meteo Weather API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Location**: Bangalore (12.9716°N, 77.5946°E)
- **Parameters**: daily temperature_2m_max, precipitation_sum
- **Date Range**: Last 30 days for correlation analysis

## Data Models

### Activity Data Model
```javascript
{
  date: "2024-12-14",
  commits: 15,
  activityScore: 75, // Normalized 0-100%
  source: "user" | "baseline"
}
```

### Weather Data Model
```javascript
{
  date: "2024-12-14",
  maxTemp: 28.5,
  rainfall: 2.3,
  conditions: "light_rain"
}
```

### Insight Data Model
```javascript
{
  type: "weather_correlation" | "performance_comparison",
  message: "On rainy days, you code 20% more intensely than the industry average",
  confidence: 0.85,
  dataPoints: 14
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 1.1, 2.1, and 3.1 all test API fetching behavior and can be combined into a comprehensive API interaction property
- Properties 4.1, 4.2, and 4.3 all test normalization and can be combined into a single normalization property
- Properties 1.2, 3.2, and 5.1 test data rendering and can be consolidated into a comprehensive rendering property
- Properties 1.3, 2.3, and 3.3 test error handling and can be combined into a unified error handling property

### Core Properties

**Property 1: API Data Fetching Consistency**
*For any* valid GitHub username or organization name, the system should successfully fetch PushEvents data and return a consistent data structure with required fields
**Validates: Requirements 1.1, 2.1, 3.1**

**Property 2: Data Normalization Preserves Relationships**
*For any* activity dataset, normalizing to 0-100% Activity Score should preserve relative patterns, maintain consistent scaling, and handle edge cases like zero values appropriately
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Property 3: Data Aggregation and Synchronization**
*For any* collection of organization data and weather data, aggregation should produce a unified baseline and synchronization should align metrics by date correctly
**Validates: Requirements 2.2, 2.5, 3.4**

**Property 4: Comprehensive Data Rendering**
*For any* complete dataset (user, baseline, weather), the system should render all components in the visualization with correct axis assignments and interactive features
**Validates: Requirements 1.2, 3.2, 5.1, 5.4**

**Property 5: Graceful Error Handling**
*For any* API failure, invalid input, or missing data scenario, the system should handle errors gracefully, maintain current state, and provide appropriate user feedback
**Validates: Requirements 1.3, 2.3, 2.4, 3.3**

**Property 6: Input Validation and Loading States**
*For any* user input or async operation, the system should validate inputs appropriately and display loading indicators during processing
**Validates: Requirements 1.4, 1.5, 7.4**

**Property 7: Insight Generation Accuracy**
*For any* sufficient dataset, the system should generate statistically accurate insights and correlations while avoiding misleading conclusions
**Validates: Requirements 6.1, 6.2, 6.5**

**Property 8: Responsive UI Behavior**
*For any* viewport size or interactive element, the system should maintain responsive layout and provide appropriate visual feedback
**Validates: Requirements 7.2, 7.3, 7.5**

## Error Handling

### API Error Management
- **Rate Limiting**: Implement exponential backoff for GitHub API rate limits
- **Network Failures**: Graceful degradation with cached data when available
- **Invalid Responses**: Validate API response structure and handle malformed data
- **CORS Issues**: Proper error messaging for cross-origin restrictions

### Data Processing Errors
- **Empty Datasets**: Handle scenarios with no activity data gracefully
- **Date Mismatches**: Robust date parsing and synchronization
- **Calculation Errors**: Prevent division by zero in normalization algorithms
- **Memory Constraints**: Efficient data processing for large datasets

### User Interface Errors
- **Loading States**: Clear indicators during async operations
- **Validation Feedback**: Real-time input validation with helpful messages
- **Chart Rendering**: Fallback displays when Chart.js fails to initialize
- **Responsive Breakpoints**: Graceful layout adaptation across devices

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing**:
- Specific examples demonstrating correct behavior
- Edge cases like empty inputs, API failures, and boundary values
- Integration points between components
- Chart rendering and interaction behaviors

**Property-Based Testing**:
- Universal properties verified across all valid inputs using fast-check library
- Minimum 100 iterations per property test for statistical confidence
- Each property test tagged with format: **Feature: unicorn-weather-index, Property {number}: {property_text}**
- Focus on data transformation, normalization, and correlation algorithms

**Testing Framework**: Jest for unit tests, fast-check for property-based testing

**Key Testing Areas**:
1. API data fetching and error handling
2. Data normalization and aggregation algorithms
3. Date synchronization and correlation analysis
4. Chart rendering and responsive behavior
5. Input validation and user feedback systems

### Property-Based Test Configuration
- Each property test runs minimum 100 iterations
- Custom generators for GitHub usernames, activity data, and weather data
- Shrinking enabled to find minimal failing examples
- Statistical validation for correlation algorithms
