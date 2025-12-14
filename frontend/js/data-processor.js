/**
 * DataProcessor - Handles data normalization, aggregation, and correlation analysis
 * Transforms raw GitHub and weather data into normalized metrics for visualization
 */

class DataProcessor {
    constructor() {
        console.log('🔄 DataProcessor initialized');
    }

    /**
     * Aggregate organization data to create baseline calculation with enhanced error handling
     * @param {Object} orgDataArray - Object mapping org names to their events
     * @returns {Array} Aggregated baseline data by date
     */
    aggregateOrgData(orgDataArray) {
        try {
            if (!orgDataArray || typeof orgDataArray !== 'object') {
                throw new Error('Organization data must be an object');
            }

            console.log('📊 Aggregating organization data for baseline calculation');

            // Collect all events from all organizations
            const allEvents = [];
            const orgNames = Object.keys(orgDataArray);
            const processingErrors = [];
            
            if (orgNames.length === 0) {
                console.warn('⚠️ No organization data provided');
                return [];
            }

            // Flatten all organization events with error handling
            orgNames.forEach(orgName => {
                try {
                    const events = orgDataArray[orgName];
                    if (!Array.isArray(events)) {
                        processingErrors.push(`${orgName}: Invalid data format (expected array)`);
                        return;
                    }

                    let validEvents = 0;
                    events.forEach((event, index) => {
                        try {
                            if (!event || typeof event !== 'object') {
                                return; // Skip invalid events silently
                            }

                            if (event.type === 'PushEvent' && event.created_at) {
                                const processedEvent = {
                                    ...event,
                                    orgName: orgName,
                                    date: this.extractDateFromTimestamp(event.created_at),
                                    commits: this.safeGetCommitCount(event)
                                };
                                allEvents.push(processedEvent);
                                validEvents++;
                            }
                        } catch (eventError) {
                            // Log but don't fail for individual event processing errors
                            console.warn(`⚠️ Skipping invalid event ${index} from ${orgName}:`, eventError.message);
                        }
                    });

                    console.log(`📈 Processed ${validEvents}/${events.length} valid events from ${orgName}`);
                } catch (orgError) {
                    processingErrors.push(`${orgName}: ${orgError.message}`);
                    console.error(`❌ Failed to process organization ${orgName}:`, orgError);
                }
            });

            if (processingErrors.length > 0) {
                console.warn(`⚠️ Processing errors encountered: ${processingErrors.join('; ')}`);
            }

            if (allEvents.length === 0) {
                console.warn('⚠️ No valid events found in organization data');
                return [];
            }

            console.log(`📈 Processing ${allEvents.length} total valid events from ${orgNames.length} organizations`);

            // Group events by date and aggregate with error handling
            const dateGroups = {};
            allEvents.forEach((event, index) => {
                try {
                    const date = event.date;
                    if (!date || typeof date !== 'string') {
                        console.warn(`⚠️ Skipping event ${index} with invalid date: ${date}`);
                        return;
                    }

                    if (!dateGroups[date]) {
                        dateGroups[date] = {
                            date: date,
                            totalCommits: 0,
                            eventCount: 0,
                            organizations: new Set()
                        };
                    }
                    
                    dateGroups[date].totalCommits += event.commits || 0;
                    dateGroups[date].eventCount += 1;
                    dateGroups[date].organizations.add(event.orgName);
                } catch (groupError) {
                    console.warn(`⚠️ Error grouping event ${index}:`, groupError.message);
                }
            });

            // Convert to array and sort by date with error handling
            const aggregatedData = Object.values(dateGroups)
                .map(group => ({
                    date: group.date,
                    commits: group.totalCommits || 0,
                    events: group.eventCount || 0,
                    orgCount: group.organizations.size || 0,
                    source: 'baseline'
                }))
                .filter(item => item.date) // Remove items with invalid dates
                .sort((a, b) => {
                    try {
                        return new Date(a.date) - new Date(b.date);
                    } catch (sortError) {
                        console.warn('⚠️ Date sorting error:', sortError.message);
                        return 0;
                    }
                });

            console.log(`✅ Aggregated data into ${aggregatedData.length} daily baseline points`);
            
            if (processingErrors.length > 0) {
                // Return data with error information for user feedback
                return {
                    data: aggregatedData,
                    errors: processingErrors,
                    hasErrors: true,
                    message: `Baseline calculated with ${processingErrors.length} organization(s) having issues`
                };
            }

            return aggregatedData;
        } catch (error) {
            console.error('❌ Critical error in aggregateOrgData:', error);
            throw new Error(`Failed to aggregate organization data: ${error.message}`);
        }
    }

    /**
     * Safely extract commit count from event payload
     * @param {Object} event - GitHub event object
     * @returns {number} Number of commits
     */
    safeGetCommitCount(event) {
        try {
            if (event.payload && Array.isArray(event.payload.commits)) {
                return Math.max(1, event.payload.commits.length);
            }
            return 1; // Default to 1 commit if payload is missing or invalid
        } catch (error) {
            console.warn('⚠️ Error extracting commit count, defaulting to 1:', error.message);
            return 1;
        }
    }

    /**
     * Normalize activity data to 0-100% Activity Score scale
     * @param {Array} rawData - Raw activity data with commits/events
     * @param {number} maxValue - Optional maximum value for normalization (auto-calculated if not provided)
     * @returns {Array} Normalized data with activityScore field
     */
    normalizeToActivityScore(rawData, maxValue = null) {
        if (!Array.isArray(rawData)) {
            throw new Error('Raw data must be an array');
        }

        if (rawData.length === 0) {
            console.warn('⚠️ Empty data array provided for normalization');
            return [];
        }

        console.log(`🎯 Normalizing ${rawData.length} data points to Activity Score (0-100%)`);

        // Calculate maximum value if not provided
        if (maxValue === null) {
            maxValue = Math.max(...rawData.map(item => item.commits || 0));
        }

        if (maxValue === 0) {
            console.warn('⚠️ Maximum value is 0, all activity scores will be 0');
            return rawData.map(item => ({
                ...item,
                activityScore: 0
            }));
        }

        // Normalize each data point
        const normalizedData = rawData.map(item => {
            const commits = item.commits || 0;
            const activityScore = Math.round((commits / maxValue) * 100);
            
            return {
                ...item,
                activityScore: Math.min(100, Math.max(0, activityScore)) // Clamp to 0-100
            };
        });

        const avgScore = normalizedData.reduce((sum, item) => sum + item.activityScore, 0) / normalizedData.length;
        console.log(`✅ Normalization complete. Average activity score: ${avgScore.toFixed(1)}%`);

        return normalizedData;
    }

    /**
     * Synchronize activity and weather data by date with enhanced error handling
     * @param {Array} activityData - Activity data with date field
     * @param {Object} weatherData - Weather API response object
     * @returns {Array} Synchronized data with both activity and weather metrics
     */
    synchronizeActivityAndWeather(activityData, weatherData) {
        try {
            if (!Array.isArray(activityData)) {
                throw new Error('Activity data must be an array');
            }

            // Handle missing or invalid weather data gracefully
            if (!weatherData || !weatherData.daily || !Array.isArray(weatherData.daily.time)) {
                console.warn('⚠️ Weather data unavailable or invalid, proceeding with activity data only');
                return activityData.map(item => ({
                    ...item,
                    weather: {
                        maxTemp: null,
                        rainfall: 0,
                        conditions: 'unknown'
                    }
                }));
            }

            console.log('🔄 Synchronizing activity and weather data by date');

            // Create weather lookup by date with error handling
            const weatherLookup = {};
            const weatherErrors = [];

            weatherData.daily.time.forEach((date, index) => {
                try {
                    if (!date || typeof date !== 'string') {
                        weatherErrors.push(`Invalid date at index ${index}: ${date}`);
                        return;
                    }

                    const maxTemp = this.safeGetWeatherValue(weatherData.daily.temperature_2m_max, index, 'temperature');
                    const rainfall = this.safeGetWeatherValue(weatherData.daily.precipitation_sum, index, 'rainfall', 0);

                    weatherLookup[date] = {
                        date: date,
                        maxTemp: maxTemp,
                        rainfall: rainfall,
                        conditions: this.determineWeatherConditions(maxTemp, rainfall)
                    };
                } catch (weatherError) {
                    weatherErrors.push(`Error processing weather for ${date}: ${weatherError.message}`);
                }
            });

            if (weatherErrors.length > 0) {
                console.warn(`⚠️ Weather processing errors: ${weatherErrors.slice(0, 3).join('; ')}${weatherErrors.length > 3 ? '...' : ''}`);
            }

            // Synchronize activity data with weather
            const synchronizedData = [];
            const syncErrors = [];

            activityData.forEach((activityItem, index) => {
                try {
                    if (!activityItem || typeof activityItem !== 'object') {
                        syncErrors.push(`Invalid activity item at index ${index}`);
                        return;
                    }

                    const itemDate = activityItem.date;
                    if (!itemDate) {
                        syncErrors.push(`Missing date in activity item at index ${index}`);
                        return;
                    }

                    const weather = weatherLookup[itemDate] || {
                        maxTemp: null,
                        rainfall: 0,
                        conditions: 'unknown'
                    };

                    synchronizedData.push({
                        ...activityItem,
                        weather: weather
                    });
                } catch (syncError) {
                    syncErrors.push(`Error syncing item ${index}: ${syncError.message}`);
                }
            });

            // Add weather-only dates that don't have activity data (if weather data is available)
            if (Object.keys(weatherLookup).length > 0) {
                const activityDates = new Set(synchronizedData.map(item => item.date).filter(date => date));
                
                Object.keys(weatherLookup).forEach(date => {
                    if (!activityDates.has(date)) {
                        synchronizedData.push({
                            date: date,
                            commits: 0,
                            activityScore: 0,
                            source: 'weather-only',
                            weather: weatherLookup[date]
                        });
                    }
                });
            }

            // Sort by date with error handling
            synchronizedData.sort((a, b) => {
                try {
                    return new Date(a.date) - new Date(b.date);
                } catch (sortError) {
                    console.warn('⚠️ Date sorting error:', sortError.message);
                    return 0;
                }
            });

            if (syncErrors.length > 0) {
                console.warn(`⚠️ Synchronization errors: ${syncErrors.slice(0, 3).join('; ')}${syncErrors.length > 3 ? '...' : ''}`);
            }

            console.log(`✅ Synchronized ${synchronizedData.length} data points with weather information`);
            return synchronizedData;
        } catch (error) {
            console.error('❌ Critical error in synchronizeActivityAndWeather:', error);
            // Return activity data without weather as fallback
            console.log('🔄 Falling back to activity data without weather information');
            return activityData.map(item => ({
                ...item,
                weather: {
                    maxTemp: null,
                    rainfall: 0,
                    conditions: 'unknown'
                }
            }));
        }
    }

    /**
     * Safely extract weather values with error handling
     * @param {Array} weatherArray - Weather data array
     * @param {number} index - Array index
     * @param {string} type - Type of weather data for error messages
     * @param {*} defaultValue - Default value if extraction fails
     * @returns {*} Weather value or default
     */
    safeGetWeatherValue(weatherArray, index, type, defaultValue = null) {
        try {
            if (!Array.isArray(weatherArray)) {
                return defaultValue;
            }
            
            if (index < 0 || index >= weatherArray.length) {
                return defaultValue;
            }
            
            const value = weatherArray[index];
            
            // Handle null/undefined values
            if (value === null || value === undefined) {
                return defaultValue;
            }
            
            // Validate numeric values
            if (type === 'temperature' || type === 'rainfall') {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    console.warn(`⚠️ Invalid ${type} value: ${value}, using default`);
                    return defaultValue;
                }
                return numValue;
            }
            
            return value;
        } catch (error) {
            console.warn(`⚠️ Error extracting ${type} at index ${index}:`, error.message);
            return defaultValue;
        }
    }

    /**
     * Process user events into daily activity data
     * @param {Array} userEvents - Raw user events from GitHub API
     * @returns {Array} Processed daily activity data
     */
    processUserEvents(userEvents) {
        if (!Array.isArray(userEvents)) {
            throw new Error('User events must be an array');
        }

        console.log(`👤 Processing ${userEvents.length} user events`);

        // Filter and group PushEvents by date
        const dateGroups = {};
        userEvents.forEach(event => {
            if (event.type === 'PushEvent' && event.created_at) {
                const date = this.extractDateFromTimestamp(event.created_at);
                if (!dateGroups[date]) {
                    dateGroups[date] = {
                        date: date,
                        commits: 0,
                        events: 0
                    };
                }
                
                dateGroups[date].commits += event.payload?.commits?.length || 1;
                dateGroups[date].events += 1;
            }
        });

        // Convert to array and add metadata
        const processedData = Object.values(dateGroups)
            .map(group => ({
                ...group,
                source: 'user'
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log(`✅ Processed user data into ${processedData.length} daily activity points`);
        return processedData;
    }

    /**
     * Fill missing dates in activity data with zero values
     * @param {Array} activityData - Activity data array
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Array} Activity data with filled missing dates
     */
    fillMissingDates(activityData, startDate, endDate) {
        if (!Array.isArray(activityData)) {
            throw new Error('Activity data must be an array');
        }

        console.log(`📅 Filling missing dates from ${startDate} to ${endDate}`);

        // Create lookup for existing data
        const dataLookup = {};
        activityData.forEach(item => {
            dataLookup[item.date] = item;
        });

        // Generate all dates in range
        const filledData = [];
        const currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);

        while (currentDate <= endDateObj) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            if (dataLookup[dateStr]) {
                filledData.push(dataLookup[dateStr]);
            } else {
                filledData.push({
                    date: dateStr,
                    commits: 0,
                    events: 0,
                    activityScore: 0,
                    source: activityData[0]?.source || 'unknown'
                });
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log(`✅ Filled data to ${filledData.length} total data points`);
        return filledData;
    }

    /**
     * Extract date (YYYY-MM-DD) from ISO timestamp
     * @param {string} timestamp - ISO timestamp string
     * @returns {string} Date in YYYY-MM-DD format
     */
    extractDateFromTimestamp(timestamp) {
        if (!timestamp) {
            throw new Error('Timestamp is required');
        }

        try {
            return new Date(timestamp).toISOString().split('T')[0];
        } catch (error) {
            throw new Error(`Invalid timestamp format: ${timestamp}`);
        }
    }

    /**
     * Determine weather conditions based on temperature and rainfall
     * @param {number} maxTemp - Maximum temperature in Celsius
     * @param {number} rainfall - Rainfall in mm
     * @returns {string} Weather condition description
     */
    determineWeatherConditions(maxTemp, rainfall) {
        if (maxTemp === null || maxTemp === undefined) {
            return 'unknown';
        }

        const rain = rainfall || 0;
        
        if (rain > 10) {
            return 'heavy_rain';
        } else if (rain > 2) {
            return 'light_rain';
        } else if (maxTemp > 35) {
            return 'hot';
        } else if (maxTemp > 28) {
            return 'warm';
        } else if (maxTemp > 20) {
            return 'pleasant';
        } else {
            return 'cool';
        }
    }

    /**
     * Calculate statistics for a dataset
     * @param {Array} data - Array of data points with numeric values
     * @param {string} field - Field name to calculate statistics for
     * @returns {Object} Statistics object
     */
    calculateStatistics(data, field = 'activityScore') {
        if (!Array.isArray(data) || data.length === 0) {
            return {
                count: 0,
                sum: 0,
                mean: 0,
                median: 0,
                min: 0,
                max: 0,
                stdDev: 0
            };
        }

        const values = data.map(item => item[field] || 0).filter(val => !isNaN(val));
        
        if (values.length === 0) {
            return {
                count: 0,
                sum: 0,
                mean: 0,
                median: 0,
                min: 0,
                max: 0,
                stdDev: 0
            };
        }

        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / values.length;
        
        const sortedValues = [...values].sort((a, b) => a - b);
        const median = sortedValues.length % 2 === 0
            ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
            : sortedValues[Math.floor(sortedValues.length / 2)];
        
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
            count: values.length,
            sum: sum,
            mean: parseFloat(mean.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            min: Math.min(...values),
            max: Math.max(...values),
            stdDev: parseFloat(stdDev.toFixed(2))
        };
    }

    /**
     * Get date range from activity data
     * @param {Array} activityData - Activity data array
     * @returns {Object} Object with startDate and endDate
     */
    getDateRange(activityData) {
        if (!Array.isArray(activityData) || activityData.length === 0) {
            return { startDate: null, endDate: null };
        }

        const dates = activityData.map(item => item.date).filter(date => date);
        
        if (dates.length === 0) {
            return { startDate: null, endDate: null };
        }

        dates.sort();
        
        return {
            startDate: dates[0],
            endDate: dates[dates.length - 1]
        };
    }
}

// Export for use in other modules
export default DataProcessor;