/**
 * ChartRenderer - Manages Chart.js visualization with dual y-axes configuration
 * Handles combo chart rendering for activity scores and weather data
 */

class ChartRenderer {
    constructor() {
        this.chart = null;
        this.canvas = null;
        this.ctx = null;
        
        // Chart configuration constants
        this.colors = {
            userActivity: '#00d4aa',      // Teal for user activity line
            industryBaseline: '#0066ff',   // Blue for industry baseline line
            rainfall: '#4a90e2',          // Light blue for rainfall bars
            background: '#1a202c',        // Dark background
            text: '#ffffff',              // White text
            textSecondary: '#b8c5d6',     // Light gray text
            grid: '#2d3748'               // Dark gray grid
        };
        
        console.log('📊 ChartRenderer initialized');
    }

    /**
     * Prepare comprehensive chart data for professional analytics
     * @param {Array} userData - Normalized user activity data
     * @param {Array} orgData - Normalized organization baseline data
     * @param {Object} weatherData - Weather data from API
     * @returns {Object} Chart.js compatible data structure
     */
    prepareComprehensiveChartData(userData, orgData, weatherData) {
        try {
            // Prepare labels (dates)
            const labels = userData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });

            // Prepare datasets
            const datasets = [
                {
                    label: 'Your Activity',
                    data: userData.map(item => item.activityScore),
                    type: 'line',
                    borderColor: this.colors.userActivity,
                    backgroundColor: this.colors.userActivity + '20',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: this.colors.userActivity,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Industry Baseline',
                    data: orgData.map(item => item.activityScore),
                    type: 'line',
                    borderColor: this.colors.industryBaseline,
                    backgroundColor: this.colors.industryBaseline + '20',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: this.colors.industryBaseline,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    yAxisID: 'y'
                }
            ];

            // Add weather data if available
            if (weatherData.daily && weatherData.daily.precipitation_sum) {
                datasets.push({
                    label: 'Precipitation (mm)',
                    data: weatherData.daily.precipitation_sum.slice(0, userData.length),
                    type: 'bar',
                    backgroundColor: this.colors.rainfall + '60',
                    borderColor: this.colors.rainfall,
                    borderWidth: 1,
                    yAxisID: 'y1',
                    order: 3
                });
            }

            if (weatherData.daily && weatherData.daily.temperature_2m_max) {
                datasets.push({
                    label: 'Temperature (°C)',
                    data: weatherData.daily.temperature_2m_max.slice(0, userData.length),
                    type: 'line',
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b20',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 2,
                    yAxisID: 'y2',
                    order: 2
                });
            }

            return { labels, datasets };

        } catch (error) {
            console.error('Failed to prepare comprehensive chart data:', error);
            throw error;
        }
    }

    /**
     * Create combo chart with dual y-axes configuration and enhanced error handling
     * @param {HTMLCanvasElement} canvasElement - Canvas element for chart
     * @param {Object} datasets - Chart datasets configuration
     * @param {Object} options - Additional chart options
     * @returns {Chart} Chart.js instance
     */
    createComboChart(canvasElement, datasets = {}, options = {}) {
        try {
            // Enhanced canvas validation
            if (!canvasElement) {
                throw new Error('Canvas element is required');
            }

            if (!(canvasElement instanceof HTMLCanvasElement)) {
                throw new Error('Provided element is not a valid canvas element');
            }

            // Check if canvas is in the DOM
            if (!document.contains(canvasElement)) {
                throw new Error('Canvas element is not attached to the DOM');
            }

            // Validate canvas dimensions
            const rect = canvasElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                console.warn('⚠️ Canvas has zero dimensions, chart may not render properly');
            }

            this.canvas = canvasElement;
            
            // Enhanced context validation
            try {
                this.ctx = canvasElement.getContext('2d');
                if (!this.ctx) {
                    throw new Error('Failed to get 2D rendering context from canvas');
                }
            } catch (contextError) {
                throw new Error(`Canvas context error: ${contextError.message}`);
            }

            // Destroy existing chart if it exists
            if (this.chart) {
                try {
                    this.chart.destroy();
                    this.chart = null;
                } catch (destroyError) {
                    console.warn('⚠️ Error destroying existing chart:', destroyError.message);
                }
            }

            // Validate Chart.js availability
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js library is not loaded. Please ensure Chart.js is included in your page.');
            }

            // Enhanced datasets validation
            const validatedDatasets = this.validateAndSanitizeDatasets(datasets);
            
            // Configure dual y-axes chart options with error handling
            const chartOptions = this.configureDualYAxes(options);

            // Create Chart.js instance with enhanced error handling
            try {
                this.chart = new Chart(this.ctx, {
                    type: 'line', // Base type, individual datasets can override
                    data: validatedDatasets,
                    options: chartOptions
                });
            } catch (chartError) {
                // Provide more specific error messages
                if (chartError.message.includes('Canvas')) {
                    throw new Error('Chart rendering failed: Canvas element is not properly initialized');
                } else if (chartError.message.includes('data')) {
                    throw new Error('Chart rendering failed: Invalid data format provided');
                } else {
                    throw new Error(`Chart rendering failed: ${chartError.message}`);
                }
            }

            // Add interactive features and hover effects with error handling
            try {
                this.addInteractiveFeatures();
                this.addHoverEffects();
            } catch (interactiveError) {
                console.warn('⚠️ Failed to add interactive features:', interactiveError.message);
                // Continue without interactive features rather than failing completely
            }

            console.log('✅ Combo chart created successfully with dual y-axes and interactive features');
            return this.chart;

        } catch (error) {
            console.error('❌ Failed to create chart:', error);
            
            // Attempt to show fallback message in canvas
            this.showChartErrorFallback(canvasElement, error.message);
            
            throw new Error(`Chart creation failed: ${error.message}`);
        }
    }

    /**
     * Validate and sanitize chart datasets
     * @param {Object} datasets - Raw datasets object
     * @returns {Object} Validated datasets object
     */
    validateAndSanitizeDatasets(datasets = {}) {
        try {
            // Default datasets structure
            const defaultDatasets = {
                labels: [],
                datasets: []
            };

            // Validate labels
            let labels = datasets.labels || defaultDatasets.labels;
            if (!Array.isArray(labels)) {
                console.warn('⚠️ Invalid labels format, using empty array');
                labels = [];
            }

            // Validate datasets array
            let datasetsArray = datasets.datasets || defaultDatasets.datasets;
            if (!Array.isArray(datasetsArray)) {
                console.warn('⚠️ Invalid datasets format, using empty array');
                datasetsArray = [];
            }

            // Sanitize individual datasets
            const sanitizedDatasets = datasetsArray.map((dataset, index) => {
                try {
                    if (!dataset || typeof dataset !== 'object') {
                        console.warn(`⚠️ Invalid dataset at index ${index}, skipping`);
                        return null;
                    }

                    // Ensure required properties exist
                    const sanitizedDataset = {
                        label: dataset.label || `Dataset ${index + 1}`,
                        data: Array.isArray(dataset.data) ? dataset.data : [],
                        ...dataset
                    };

                    // Validate data array contains only numbers
                    sanitizedDataset.data = sanitizedDataset.data.map((value, dataIndex) => {
                        const numValue = Number(value);
                        if (isNaN(numValue)) {
                            console.warn(`⚠️ Invalid data value at dataset ${index}, index ${dataIndex}: ${value}`);
                            return 0;
                        }
                        return numValue;
                    });

                    return sanitizedDataset;
                } catch (datasetError) {
                    console.warn(`⚠️ Error processing dataset ${index}:`, datasetError.message);
                    return null;
                }
            }).filter(dataset => dataset !== null);

            return {
                labels: labels,
                datasets: sanitizedDatasets
            };
        } catch (error) {
            console.error('❌ Error validating datasets:', error);
            return {
                labels: [],
                datasets: []
            };
        }
    }

    /**
     * Show error fallback message in canvas when chart creation fails
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {string} errorMessage - Error message to display
     */
    showChartErrorFallback(canvas, errorMessage) {
        try {
            if (!canvas || !canvas.getContext) {
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Set up error display
            ctx.fillStyle = '#1a202c'; // Dark background
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw error message
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.fillText('⚠️ Chart Error', centerX, centerY - 20);
            
            ctx.font = '12px Arial, sans-serif';
            ctx.fillStyle = '#b8c5d6';
            
            // Wrap long error messages
            const maxWidth = canvas.width - 40;
            const words = errorMessage.split(' ');
            let line = '';
            let y = centerY + 10;

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, centerX, y);
                    line = words[n] + ' ';
                    y += 16;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, centerX, y);

        } catch (fallbackError) {
            console.warn('⚠️ Failed to show chart error fallback:', fallbackError.message);
        }
    }

    /**
     * Configure dual y-axes for activity scores and rainfall data
     * @param {Object} customOptions - Custom options to merge
     * @returns {Object} Complete chart options configuration
     */
    configureDualYAxes(customOptions = {}) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Coding Activity vs Weather Patterns - Unicorn Weather Index',
                    color: this.colors.text,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: this.colors.textSecondary,
                        font: {
                            size: 12
                        },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(26, 32, 44, 0.95)',
                    titleColor: this.colors.text,
                    bodyColor: this.colors.textSecondary,
                    borderColor: this.colors.grid,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    footerFont: {
                        size: 10,
                        style: 'italic'
                    },
                    callbacks: {
                        title: (tooltipItems) => {
                            const date = new Date(tooltipItems[0].label);
                            return date.toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric' 
                            });
                        },
                        label: (context) => {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.y;
                            
                            if (context.dataset.yAxisID === 'y1') {
                                // Rainfall data (right y-axis)
                                const intensity = this.getRainfallIntensity(value);
                                return `${datasetLabel}: ${value.toFixed(1)} mm (${intensity})`;
                            } else {
                                // Activity data (left y-axis)
                                const performance = this.getPerformanceLevel(value);
                                return `${datasetLabel}: ${value.toFixed(1)}% (${performance})`;
                            }
                        },
                        afterBody: (tooltipItems) => {
                            // Add contextual information
                            const context = tooltipItems[0];
                            const dataIndex = context.dataIndex;
                            
                            // Get all dataset values for this date
                            const allValues = tooltipItems.map(item => ({
                                label: item.dataset.label,
                                value: item.parsed.y,
                                yAxisID: item.dataset.yAxisID
                            }));
                            
                            const activityValues = allValues.filter(v => v.yAxisID !== 'y1');
                            const rainfallValue = allValues.find(v => v.yAxisID === 'y1');
                            
                            let contextInfo = [];
                            
                            // Compare user vs industry if both exist
                            if (activityValues.length >= 2) {
                                const userValue = activityValues.find(v => v.label === 'Me')?.value || 0;
                                const industryValue = activityValues.find(v => v.label === 'Industry Standard')?.value || 0;
                                
                                if (userValue > industryValue) {
                                    const diff = ((userValue - industryValue) / industryValue * 100).toFixed(1);
                                    contextInfo.push(`🚀 ${diff}% above industry average`);
                                } else if (userValue < industryValue) {
                                    const diff = ((industryValue - userValue) / industryValue * 100).toFixed(1);
                                    contextInfo.push(`📈 ${diff}% below industry average`);
                                } else {
                                    contextInfo.push('⚖️ Matching industry performance');
                                }
                            }
                            
                            // Weather context
                            if (rainfallValue) {
                                if (rainfallValue.value > 5) {
                                    contextInfo.push('🌧️ Heavy rain day');
                                } else if (rainfallValue.value > 0) {
                                    contextInfo.push('🌦️ Light rain day');
                                } else {
                                    contextInfo.push('☀️ Dry day');
                                }
                            }
                            
                            return contextInfo;
                        },
                        footer: (tooltipItems) => {
                            return 'Click and drag to zoom • Double-click to reset';
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    display: true,
                    title: {
                        display: true,
                        text: 'Date',
                        color: this.colors.textSecondary,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: this.colors.textSecondary,
                        maxTicksLimit: 10,
                        callback: function(value, index, values) {
                            // Show every nth tick to avoid crowding
                            const label = this.getLabelForValue(value);
                            if (values.length > 15) {
                                return index % Math.ceil(values.length / 8) === 0 ? label : '';
                            }
                            return label;
                        }
                    },
                    grid: {
                        color: this.colors.grid,
                        lineWidth: 1
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Activity Score (%)',
                        color: this.colors.textSecondary,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: 100,
                    ticks: {
                        color: this.colors.textSecondary,
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: this.colors.grid,
                        lineWidth: 1
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Rainfall (mm)',
                        color: this.colors.textSecondary,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    ticks: {
                        color: this.colors.textSecondary,
                        callback: function(value) {
                            return value.toFixed(1) + ' mm';
                        }
                    },
                    grid: {
                        drawOnChartArea: false, // Don't draw grid lines for right y-axis
                        color: this.colors.grid,
                        lineWidth: 1
                    }
                }
            }
        };

        // Deep merge custom options
        return this.deepMerge(baseOptions, customOptions);
    }

    /**
     * Update chart with new data and enhanced error handling
     * @param {Object} newData - New chart data
     * @param {Object} options - Update options
     */
    updateChart(newData, options = {}) {
        try {
            if (!this.chart) {
                throw new Error('Chart not initialized. Call createComboChart first.');
            }

            // Validate chart is still functional
            if (this.chart.destroyed) {
                throw new Error('Chart has been destroyed. Create a new chart instance.');
            }

            // Validate new data
            if (!newData || typeof newData !== 'object') {
                throw new Error('New data must be a valid object');
            }

            // Validate and sanitize new data
            const validatedData = this.validateAndSanitizeDatasets(newData);

            // Update labels if provided
            if (validatedData.labels && Array.isArray(validatedData.labels)) {
                this.chart.data.labels = validatedData.labels;
            }

            // Update datasets if provided
            if (validatedData.datasets && Array.isArray(validatedData.datasets)) {
                // Preserve existing dataset configurations where possible
                this.chart.data.datasets = validatedData.datasets.map((newDataset, index) => {
                    const existingDataset = this.chart.data.datasets[index];
                    if (existingDataset) {
                        // Merge new data with existing configuration
                        return {
                            ...existingDataset,
                            ...newDataset,
                            data: newDataset.data || existingDataset.data || []
                        };
                    }
                    return newDataset;
                });
            }

            // Update chart with animation and error handling
            const updateOptions = {
                duration: options.animated !== false ? 750 : 0,
                easing: 'easeInOutQuart'
            };

            try {
                this.chart.update(updateOptions);
                console.log('✅ Chart updated successfully');
            } catch (updateError) {
                // Try updating without animation as fallback
                console.warn('⚠️ Animated update failed, trying without animation:', updateError.message);
                try {
                    this.chart.update('none');
                    console.log('✅ Chart updated successfully (without animation)');
                } catch (fallbackError) {
                    throw new Error(`Chart update failed completely: ${fallbackError.message}`);
                }
            }

        } catch (error) {
            console.error('❌ Failed to update chart:', error);
            
            // Attempt to show error state in chart
            if (this.chart && !this.chart.destroyed) {
                try {
                    this.showChartErrorFallback(this.canvas, `Update failed: ${error.message}`);
                } catch (fallbackError) {
                    console.warn('⚠️ Failed to show error fallback:', fallbackError.message);
                }
            }
            
            throw new Error(`Chart update failed: ${error.message}`);
        }
    }

    /**
     * Configure responsive chart options for different screen sizes
     * @returns {Object} Responsive configuration
     */
    configureResponsiveOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: window.innerWidth < 768 ? 1.2 : 2.0,
            plugins: {
                legend: {
                    position: window.innerWidth < 768 ? 'bottom' : 'top',
                    labels: {
                        boxWidth: window.innerWidth < 768 ? 12 : 15,
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        }
                    }
                },
                title: {
                    font: {
                        size: window.innerWidth < 768 ? 14 : 18
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: window.innerWidth < 768 ? 6 : 10,
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        }
                    }
                },
                y1: {
                    ticks: {
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        }
                    }
                }
            }
        };
    }

    /**
     * Create dataset configuration for user activity line
     * @param {Array} data - Activity data points
     * @param {string} label - Dataset label
     * @returns {Object} Dataset configuration
     */
    createUserActivityDataset(data, label = 'Me') {
        return {
            label: label,
            data: data,
            type: 'line',
            yAxisID: 'y', // Left y-axis for activity scores
            borderColor: this.colors.userActivity,
            backgroundColor: `${this.colors.userActivity}20`, // 20% opacity
            borderWidth: 3,
            pointBackgroundColor: this.colors.userActivity,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: false
        };
    }

    /**
     * Create dataset configuration for industry baseline line
     * @param {Array} data - Baseline data points
     * @param {string} label - Dataset label
     * @returns {Object} Dataset configuration
     */
    createIndustryBaselineDataset(data, label = 'Industry Standard') {
        return {
            label: label,
            data: data,
            type: 'line',
            yAxisID: 'y', // Left y-axis for activity scores
            borderColor: this.colors.industryBaseline,
            backgroundColor: `${this.colors.industryBaseline}20`, // 20% opacity
            borderWidth: 3,
            pointBackgroundColor: this.colors.industryBaseline,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: false,
            borderDash: [5, 5] // Dashed line to differentiate from user data
        };
    }

    /**
     * Create dataset configuration for rainfall bars
     * @param {Array} data - Rainfall data points
     * @param {string} label - Dataset label
     * @returns {Object} Dataset configuration
     */
    createRainfallDataset(data, label = 'Rainfall') {
        return {
            label: label,
            data: data,
            type: 'bar',
            yAxisID: 'y1', // Right y-axis for rainfall data
            backgroundColor: `${this.colors.rainfall}60`, // 60% opacity
            borderColor: this.colors.rainfall,
            borderWidth: 1,
            barThickness: 'flex',
            maxBarThickness: 20,
            categoryPercentage: 0.8,
            barPercentage: 0.9
        };
    }

    /**
     * Prepare chart data from processed activity and weather data
     * @param {Array} userData - User activity data
     * @param {Array} baselineData - Industry baseline data
     * @param {Array} weatherData - Weather data (optional)
     * @returns {Object} Chart data configuration
     */
    prepareChartData(userData, baselineData, weatherData = null) {
        if (!Array.isArray(userData) || !Array.isArray(baselineData)) {
            throw new Error('User data and baseline data must be arrays');
        }

        // Extract dates (assuming data is synchronized)
        const labels = userData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        });

        // Extract activity scores
        const userScores = userData.map(item => item.activityScore || 0);
        const baselineScores = baselineData.map(item => item.activityScore || 0);

        // Create datasets
        const datasets = [
            this.createUserActivityDataset(userScores),
            this.createIndustryBaselineDataset(baselineScores)
        ];

        // Add rainfall data if available
        if (weatherData && Array.isArray(weatherData)) {
            const rainfallData = weatherData.map(item => 
                item.weather?.rainfall || 0
            );
            datasets.push(this.createRainfallDataset(rainfallData));
        }

        return {
            labels: labels,
            datasets: datasets
        };
    }

    /**
     * Resize chart to fit container
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
            console.log('📏 Chart resized');
        }
    }

    /**
     * Destroy chart instance and clean up resources
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
            console.log('🗑️ Chart destroyed');
        }
    }

    /**
     * Get chart instance
     * @returns {Chart|null} Chart.js instance
     */
    getChart() {
        return this.chart;
    }

    /**
     * Get rainfall intensity description
     * @param {number} rainfall - Rainfall amount in mm
     * @returns {string} Intensity description
     */
    getRainfallIntensity(rainfall) {
        if (rainfall === 0) return 'No rain';
        if (rainfall < 2.5) return 'Light';
        if (rainfall < 7.5) return 'Moderate';
        if (rainfall < 35) return 'Heavy';
        return 'Very heavy';
    }

    /**
     * Get performance level description
     * @param {number} score - Activity score percentage
     * @returns {string} Performance level
     */
    getPerformanceLevel(score) {
        if (score === 0) return 'No activity';
        if (score < 25) return 'Low';
        if (score < 50) return 'Moderate';
        if (score < 75) return 'High';
        if (score < 90) return 'Very high';
        return 'Peak';
    }

    /**
     * Add interactive features like zoom and pan
     * @param {Object} options - Interactive options
     */
    addInteractiveFeatures(options = {}) {
        if (!this.chart) {
            console.warn('⚠️ Chart not initialized, cannot add interactive features');
            return;
        }

        // Add zoom and pan functionality if Chart.js zoom plugin is available
        if (typeof Chart !== 'undefined' && Chart.register) {
            try {
                // Configure zoom options
                const zoomOptions = {
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                        onZoomComplete: (chart) => {
                            console.log('📊 Chart zoomed');
                        }
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                        onPanComplete: (chart) => {
                            console.log('📊 Chart panned');
                        }
                    }
                };

                // Update chart options with zoom configuration
                if (this.chart.options.plugins) {
                    this.chart.options.plugins.zoom = zoomOptions;
                }

                console.log('🔍 Interactive zoom/pan features added');
            } catch (error) {
                console.warn('⚠️ Zoom plugin not available:', error.message);
            }
        }

        // Add double-click to reset zoom
        if (this.canvas) {
            this.canvas.addEventListener('dblclick', () => {
                if (this.chart && this.chart.resetZoom) {
                    this.chart.resetZoom();
                    console.log('🔄 Chart zoom reset');
                }
            });
        }
    }

    /**
     * Add hover effects and animations
     */
    addHoverEffects() {
        if (!this.chart) {
            console.warn('⚠️ Chart not initialized, cannot add hover effects');
            return;
        }

        // Configure hover animations
        const hoverOptions = {
            onHover: (event, activeElements) => {
                if (this.canvas) {
                    this.canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                }
            },
            animation: {
                duration: 400,
                easing: 'easeInOutQuart'
            },
            hover: {
                animationDuration: 200,
                intersect: false
            }
        };

        // Update chart options
        Object.assign(this.chart.options, hoverOptions);
        
        console.log('✨ Hover effects added');
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Add window resize listener for responsive behavior
     */
    addResizeListener() {
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                if (this.chart) {
                    // Update responsive options
                    const responsiveOptions = this.configureResponsiveOptions();
                    Object.assign(this.chart.options, responsiveOptions);
                    this.chart.resize();
                }
            });
            console.log('👂 Resize listener added');
        }
    }

    /**
     * Remove resize listener
     */
    removeResizeListener() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.resize);
            console.log('🚫 Resize listener removed');
        }
    }
}

// Export for use in other modules
export default ChartRenderer;