/**
 * DataFetcher - Handles all external API calls with rate limiting and error handling
 * Manages GitHub API and Open-Meteo weather API interactions
 */

class DataFetcher {
    constructor() {
        this.githubBaseUrl = 'https://api.github.com';
        this.weatherBaseUrl = 'https://api.open-meteo.com/v1';
        this.bangaloreCoords = {
            latitude: 12.9716,
            longitude: 77.5946
        };
        
        // Rate limiting configuration
        this.rateLimitDelay = 1000; // 1 second between requests
        this.maxRetries = 3;
        this.lastRequestTime = 0;
        
        console.log('📡 DataFetcher initialized');
    }

    /**
     * Fetch PushEvents data from a GitHub organization
     * @param {string} orgName - GitHub organization name
     * @returns {Promise<Array>} Array of PushEvent objects
     */
    async fetchOrgEvents(orgName) {
        if (!orgName || typeof orgName !== 'string') {
            throw new Error('Organization name must be a non-empty string');
        }

        const url = `${this.githubBaseUrl}/orgs/${orgName}/events`;
        
        try {
            console.log(`🔍 Fetching events for organization: ${orgName}`);
            
            const response = await this.makeRateLimitedRequest(url);
            const events = await response.json();
            
            // Filter for PushEvents only
            const pushEvents = events.filter(event => event.type === 'PushEvent');
            
            console.log(`✅ Found ${pushEvents.length} PushEvents for ${orgName}`);
            return pushEvents;
            
        } catch (error) {
            console.error(`❌ Failed to fetch events for ${orgName}:`, error.message);
            
            // Handle specific GitHub API errors
            if (error.status === 404) {
                throw new Error(`Organization '${orgName}' not found`);
            } else if (error.status === 403) {
                throw new Error('GitHub API rate limit exceeded. Please try again later.');
            } else if (error.status === 401) {
                throw new Error('GitHub API authentication required for this request');
            }
            
            throw new Error(`Failed to fetch organization events: ${error.message}`);
        }
    }

    /**
     * Fetch PushEvents data from a GitHub user
     * @param {string} username - GitHub username
     * @returns {Promise<Array>} Array of PushEvent objects
     */
    async fetchUserEvents(username) {
        if (!username || typeof username !== 'string') {
            throw new Error('Username must be a non-empty string');
        }

        // Validate GitHub username format
        const githubUsernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
        if (!githubUsernameRegex.test(username)) {
            throw new Error('Invalid GitHub username format');
        }

        const url = `${this.githubBaseUrl}/users/${username}/events`;
        
        try {
            console.log(`🔍 Fetching events for user: ${username}`);
            
            const response = await this.makeRateLimitedRequest(url);
            const events = await response.json();
            
            // Filter for PushEvents only
            const pushEvents = events.filter(event => event.type === 'PushEvent');
            
            console.log(`✅ Found ${pushEvents.length} PushEvents for ${username}`);
            return pushEvents;
            
        } catch (error) {
            console.error(`❌ Failed to fetch events for ${username}:`, error.message);
            
            // Handle specific GitHub API errors
            if (error.status === 404) {
                throw new Error(`User '${username}' not found`);
            } else if (error.status === 403) {
                throw new Error('GitHub API rate limit exceeded. Please try again later.');
            }
            
            throw new Error(`Failed to fetch user events: ${error.message}`);
        }
    }

    /**
     * Fetch weather data from Open-Meteo API for Bangalore
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Object>} Weather data object
     */
    async fetchWeatherData(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new Error('Start date and end date are required');
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw new Error('Dates must be in YYYY-MM-DD format');
        }

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            throw new Error('Start date must be before end date');
        }

        const params = new URLSearchParams({
            latitude: this.bangaloreCoords.latitude,
            longitude: this.bangaloreCoords.longitude,
            start_date: startDate,
            end_date: endDate,
            daily: 'temperature_2m_max,precipitation_sum',
            timezone: 'Asia/Kolkata'
        });

        const url = `${this.weatherBaseUrl}/forecast?${params}`;
        
        try {
            console.log(`🌤️ Fetching weather data from ${startDate} to ${endDate}`);
            
            const response = await this.makeRateLimitedRequest(url);
            const weatherData = await response.json();
            
            // Validate response structure
            if (!weatherData.daily || !weatherData.daily.time) {
                throw new Error('Invalid weather API response structure');
            }
            
            console.log(`✅ Retrieved weather data for ${weatherData.daily.time.length} days`);
            return weatherData;
            
        } catch (error) {
            console.error(`❌ Failed to fetch weather data:`, error.message);
            throw new Error(`Failed to fetch weather data: ${error.message}`);
        }
    }

    /**
     * Make a rate-limited HTTP request with retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async makeRateLimitedRequest(url, options = {}) {
        // Implement rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delay = this.rateLimitDelay - timeSinceLastRequest;
            console.log(`⏳ Rate limiting: waiting ${delay}ms`);
            await this.sleep(delay);
        }
        
        this.lastRequestTime = Date.now();
        
        // Enhanced retry logic with better error handling
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Add timeout to prevent hanging requests
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'UnicornWeatherIndex/1.0',
                        ...options.headers
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    error.status = response.status;
                    error.response = response;
                    
                    // Enhanced error context
                    error.url = url;
                    error.attempt = attempt;
                    error.isRetryable = this.isRetryableError(response.status);
                    
                    throw error;
                }
                
                return response;
                
            } catch (error) {
                console.warn(`⚠️ Request attempt ${attempt}/${this.maxRetries} failed:`, error.message);
                
                // Handle network errors
                if (error.name === 'AbortError') {
                    error.message = 'Request timeout - server took too long to respond';
                    error.isRetryable = true;
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    error.message = 'Network error - please check your internet connection';
                    error.isRetryable = true;
                }
                
                // Enhanced retry logic
                const shouldRetry = this.shouldRetryRequest(error, attempt);
                
                if (!shouldRetry || attempt === this.maxRetries) {
                    // Add context to final error
                    error.finalAttempt = true;
                    error.totalAttempts = attempt;
                    error.url = url;
                    throw error;
                }
                
                // Progressive backoff with jitter to avoid thundering herd
                const baseDelay = Math.pow(2, attempt) * 1000;
                const jitter = Math.random() * 1000;
                const backoffDelay = baseDelay + jitter;
                
                console.log(`🔄 Retrying in ${Math.round(backoffDelay)}ms... (attempt ${attempt + 1}/${this.maxRetries})`);
                await this.sleep(backoffDelay);
            }
        }
    }

    /**
     * Determine if an error is retryable
     * @param {number} status - HTTP status code
     * @returns {boolean} Whether the error should be retried
     */
    isRetryableError(status) {
        // Retry on server errors (5xx) and rate limiting (429)
        return status >= 500 || status === 429;
    }

    /**
     * Determine if a request should be retried based on error type and attempt
     * @param {Error} error - The error that occurred
     * @param {number} attempt - Current attempt number
     * @returns {boolean} Whether to retry the request
     */
    shouldRetryRequest(error, attempt) {
        // Don't retry if we've reached max attempts
        if (attempt >= this.maxRetries) {
            return false;
        }

        // Don't retry client errors (4xx) except rate limiting (429)
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            return false;
        }

        // Retry network errors, timeouts, and server errors
        if (error.name === 'AbortError' || 
            error.name === 'TypeError' || 
            error.isRetryable || 
            !error.status) {
            return true;
        }

        return false;
    }

    /**
     * Sleep utility for delays
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get the default date range for weather data (last 30 days)
     * @returns {Object} Object with startDate and endDate strings
     */
    getDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    }

    /**
     * Fetch data from multiple organizations in parallel with enhanced error handling
     * @param {Array<string>} orgNames - Array of organization names
     * @returns {Promise<Object>} Object mapping org names to their events
     */
    async fetchMultipleOrgEvents(orgNames) {
        if (!Array.isArray(orgNames) || orgNames.length === 0) {
            throw new Error('Organization names must be a non-empty array');
        }

        console.log(`🏢 Fetching events for ${orgNames.length} organizations`);
        
        const results = {};
        const errors = {};
        const partialFailures = [];
        
        // Fetch all organizations with enhanced error handling
        const promises = orgNames.map(async (orgName) => {
            try {
                const events = await this.fetchOrgEvents(orgName);
                results[orgName] = events;
                return { orgName, success: true, events: events.length };
            } catch (error) {
                const errorInfo = {
                    message: error.message,
                    status: error.status,
                    isRetryable: error.isRetryable || false,
                    attempts: error.totalAttempts || 1
                };
                
                errors[orgName] = errorInfo;
                partialFailures.push({
                    orgName,
                    error: errorInfo,
                    canContinue: this.isNonCriticalError(error)
                });
                
                console.warn(`⚠️ Failed to fetch ${orgName}: ${error.message}`);
                return { orgName, success: false, error: errorInfo };
            }
        });
        
        const settledResults = await Promise.allSettled(promises);
        
        const successCount = Object.keys(results).length;
        const errorCount = Object.keys(errors).length;
        
        console.log(`📊 Fetched data from ${successCount}/${orgNames.length} organizations`);
        
        // Enhanced error handling for partial failures
        if (successCount === 0) {
            const criticalErrors = partialFailures.filter(f => !f.canContinue);
            if (criticalErrors.length > 0) {
                const errorMessages = criticalErrors.map(f => `${f.orgName}: ${f.error.message}`).join('; ');
                throw new Error(`Failed to fetch data from any organization. Critical errors: ${errorMessages}`);
            } else {
                throw new Error('All organization requests failed due to network or server issues. Please try again later.');
            }
        }
        
        // Warn about partial failures but continue
        if (errorCount > 0) {
            const nonCriticalFailures = partialFailures.filter(f => f.canContinue).length;
            if (nonCriticalFailures > 0) {
                console.warn(`⚠️ Continuing with partial data. ${nonCriticalFailures} organizations failed but data from ${successCount} organizations is sufficient.`);
            }
        }
        
        return {
            results,
            errors,
            successCount,
            errorCount,
            partialFailures,
            hasPartialData: successCount > 0 && errorCount > 0,
            isComplete: errorCount === 0
        };
    }

    /**
     * Determine if an error is non-critical and allows continuation with partial data
     * @param {Error} error - The error to evaluate
     * @returns {boolean} Whether the error is non-critical
     */
    isNonCriticalError(error) {
        // Rate limiting and server errors are typically temporary
        if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
            return true;
        }
        
        // Network timeouts are temporary
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return true;
        }
        
        // 404 for organizations might mean they don't exist, but others might
        if (error.status === 404) {
            return true;
        }
        
        return false;
    }

    /**
     * Handle graceful degradation when some data sources fail
     * @param {Object} fetchResult - Result from fetchMultipleOrgEvents
     * @returns {Object} Processed result with user feedback
     */
    handlePartialDataScenario(fetchResult) {
        const { successCount, errorCount, partialFailures, results } = fetchResult;
        
        let userMessage = '';
        let severity = 'info';
        
        if (fetchResult.isComplete) {
            userMessage = `Successfully loaded data from all ${successCount} organizations.`;
            severity = 'success';
        } else if (fetchResult.hasPartialData) {
            const failedOrgs = partialFailures.map(f => f.orgName).join(', ');
            userMessage = `Loaded data from ${successCount} organizations. ${errorCount} organizations (${failedOrgs}) are temporarily unavailable, but analysis can continue with available data.`;
            severity = 'warning';
        } else {
            userMessage = 'Unable to load organization data. Please check your internet connection and try again.';
            severity = 'error';
        }
        
        return {
            ...fetchResult,
            userMessage,
            severity,
            canProceed: successCount > 0
        };
    }
}

// Export for use in other modules
export default DataFetcher;