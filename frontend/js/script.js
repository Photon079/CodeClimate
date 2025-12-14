/**
 * Bangalore Weather Index - Professional Analytics Dashboard
 * Advanced analytics platform for developer productivity and weather correlation analysis
 */

import DataFetcher from './data-fetcher.js';
import DataProcessor from './data-processor.js';
import InsightGenerator from './insight-generator.js';
import ChartRenderer from './chart-renderer.js';

class BangaloreWeatherIndex {
    constructor() {
        this.dataFetcher = new DataFetcher();
        this.dataProcessor = new DataProcessor();
        this.chartRenderer = new ChartRenderer();
        this.insightGenerator = new InsightGenerator();
        
        // Application state
        this.state = {
            isLoading: false,
            currentUser: null,
            analysisData: null,
            charts: {
                main: null,
                distribution: null,
                trend: null
            }
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('Bangalore Weather Index initializing...');
        
        try {
            this.initializeElements();
            this.setupEventListeners();
            this.initializeCharts();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Application initialization failed. Please refresh the page.');
        }
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            // Input elements
            usernameInput: document.getElementById('username'),
            analyzeBtn: document.getElementById('analyze-btn'),
            loadingIndicator: document.getElementById('loading-indicator'),
            errorMessage: document.getElementById('error-message'),
            
            // Chart elements
            mainChart: document.getElementById('activity-chart'),
            distributionChart: document.getElementById('distribution-chart'),
            trendChart: document.getElementById('trend-chart'),
            
            // Metric elements
            activityMetric: document.getElementById('activity-metric'),
            weatherMetric: document.getElementById('weather-metric'),
            performanceMetric: document.getElementById('performance-metric'),
            consistencyMetric: document.getElementById('consistency-metric'),
            
            // Correlation elements
            rainCorrelation: document.getElementById('rain-correlation'),
            tempCorrelation: document.getElementById('temp-correlation'),
            seasonalVariance: document.getElementById('seasonal-variance'),
            
            // Comparison elements
            userPercentile: document.getElementById('user-percentile'),
            industryMedian: document.getElementById('industry-median'),
            topThreshold: document.getElementById('top-threshold'),
            
            // Company comparison elements
            zerodhaComparison: document.getElementById('zerodha-comparison'),
            razorpayComparison: document.getElementById('razorpay-comparison'),
            postmanComparison: document.getElementById('postman-comparison'),
            hasuraComparison: document.getElementById('hasura-comparison'),
            zerodhaBar: document.getElementById('zerodha-bar'),
            razorpayBar: document.getElementById('razorpay-bar'),
            postmanBar: document.getElementById('postman-bar'),
            hasuraBar: document.getElementById('hasura-bar'),
            
            // Trend elements
            growthRate: document.getElementById('growth-rate'),
            volatility: document.getElementById('volatility'),
            momentum: document.getElementById('momentum'),
            
            // Quality metrics
            dataCompleteness: document.getElementById('data-completeness'),
            sampleSize: document.getElementById('sample-size'),
            confidenceLevel: document.getElementById('confidence-level'),
            
            // Insights container
            insightsContainer: document.getElementById('insights-container')
        };

        // Validate critical elements
        const criticalElements = ['usernameInput', 'analyzeBtn', 'mainChart', 'insightsContainer'];
        const missingElements = criticalElements.filter(key => !this.elements[key]);
        
        if (missingElements.length > 0) {
            throw new Error(`Critical elements missing: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Analyze button
        this.elements.analyzeBtn.addEventListener('click', () => {
            this.handleAnalyze();
        });

        // Enter key in username input
        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAnalyze();
            }
        });

        // Input validation
        this.elements.usernameInput.addEventListener('input', () => {
            this.validateInput();
        });
    }

    /**
     * Initialize chart canvases
     */
    initializeCharts() {
        try {
            if (this.elements.mainChart) {
                this.state.charts.main = this.chartRenderer.createComboChart(this.elements.mainChart);
            }
            
            // Initialize other charts as needed
            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Failed to initialize charts:', error);
        }
    }

    /**
     * Handle analyze button click
     */
    async handleAnalyze() {
        const username = this.elements.usernameInput.value.trim();
        
        if (!this.validateUsername(username)) {
            return;
        }

        try {
            this.showLoading();
            this.hideError();
            
            console.log(`Starting analysis for user: ${username}`);
            
            // Fetch all data
            const [userEvents, orgData, weatherData] = await Promise.all([
                this.dataFetcher.fetchUserEvents(username),
                this.fetchOrganizationData(),
                this.fetchWeatherData()
            ]);

            // Process data
            const analysisData = await this.processAnalysisData(userEvents, orgData, weatherData);
            
            // Store analysis data
            this.state.analysisData = analysisData;
            this.state.currentUser = username;
            
            // Update all dashboard components
            this.updateDashboard(analysisData);
            
            console.log('Analysis completed successfully');
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Fetch organization data from all companies
     */
    async fetchOrganizationData() {
        const organizations = ['zerodha', 'razorpay', 'postmanlabs', 'hasura'];
        const orgData = {};
        
        for (const org of organizations) {
            try {
                orgData[org] = await this.dataFetcher.fetchOrgEvents(org);
                console.log(`Fetched ${orgData[org].length} events from ${org}`);
            } catch (error) {
                console.warn(`Failed to fetch data from ${org}:`, error);
                orgData[org] = [];
            }
        }
        
        return orgData;
    }

    /**
     * Fetch weather data for Bangalore
     */
    async fetchWeatherData() {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 90); // 90 days of data
            
            return await this.dataFetcher.fetchWeatherData(
                12.9716, // Bangalore latitude
                77.5946, // Bangalore longitude
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );
        } catch (error) {
            console.warn('Failed to fetch weather data:', error);
            return { daily: { time: [], temperature_2m_max: [], precipitation_sum: [] } };
        }
    }

    /**
     * Process all data for comprehensive analysis
     */
    async processAnalysisData(userEvents, orgData, weatherData) {
        console.log('Processing comprehensive analysis data...');
        
        // Aggregate organization data
        const aggregatedOrgData = this.dataProcessor.aggregateOrgData(Object.values(orgData).flat());
        
        // Normalize user data
        const normalizedUserData = this.dataProcessor.normalizeToActivityScore(userEvents, 100);
        const normalizedOrgData = this.dataProcessor.normalizeToActivityScore(aggregatedOrgData, 100);
        
        // Weather correlation analysis
        const weatherCorrelations = this.calculateWeatherCorrelations(normalizedUserData, weatherData);
        
        // Performance analysis
        const performanceAnalysis = this.calculatePerformanceMetrics(normalizedUserData, normalizedOrgData);
        
        // Company-specific comparisons
        const companyComparisons = this.calculateCompanyComparisons(normalizedUserData, orgData);
        
        // Trend analysis
        const trendAnalysis = this.calculateTrendAnalysis(normalizedUserData);
        
        // Generate insights
        const insights = this.insightGenerator.generateComprehensiveInsights({
            userEvents,
            normalizedUserData,
            normalizedOrgData,
            weatherCorrelations,
            performanceAnalysis,
            companyComparisons,
            trendAnalysis
        });

        return {
            userEvents,
            normalizedUserData,
            normalizedOrgData,
            weatherData,
            weatherCorrelations,
            performanceAnalysis,
            companyComparisons,
            trendAnalysis,
            insights,
            dataQuality: this.calculateDataQuality(userEvents, orgData, weatherData)
        };
    }

    /**
     * Calculate weather correlations
     */
    calculateWeatherCorrelations(userData, weatherData) {
        // Implementation for weather correlation analysis
        const correlations = {
            precipitation: this.calculateCorrelation(userData, weatherData.daily.precipitation_sum),
            temperature: this.calculateCorrelation(userData, weatherData.daily.temperature_2m_max),
            seasonal: this.calculateSeasonalVariance(userData, weatherData)
        };
        
        return {
            hasEnoughData: userData.length > 10 && weatherData.daily.time.length > 10,
            ...correlations
        };
    }

    /**
     * Calculate performance metrics
     */
    calculatePerformanceMetrics(userData, orgData) {
        if (userData.length === 0 || orgData.length === 0) {
            return { hasEnoughData: false };
        }

        const userAvg = userData.reduce((sum, item) => sum + item.activityScore, 0) / userData.length;
        const orgAvg = orgData.reduce((sum, item) => sum + item.activityScore, 0) / orgData.length;
        
        const relativePerformance = ((userAvg - orgAvg) / orgAvg) * 100;
        const userStdDev = this.calculateStandardDeviation(userData.map(item => item.activityScore));
        const consistencyScore = Math.max(0, 100 - (userStdDev / userAvg) * 100);
        
        return {
            hasEnoughData: true,
            userAverage: userAvg,
            industryAverage: orgAvg,
            relativePerformance,
            consistencyScore,
            percentile: this.calculatePercentile(userAvg, orgData.map(item => item.activityScore))
        };
    }

    /**
     * Calculate company-specific comparisons
     */
    calculateCompanyComparisons(userData, orgData) {
        const comparisons = {};
        const userAvg = userData.reduce((sum, item) => sum + item.activityScore, 0) / userData.length;
        
        Object.entries(orgData).forEach(([company, events]) => {
            if (events.length > 0) {
                const normalizedCompanyData = this.dataProcessor.normalizeToActivityScore(events, 100);
                const companyAvg = normalizedCompanyData.reduce((sum, item) => sum + item.activityScore, 0) / normalizedCompanyData.length;
                const ratio = userAvg / companyAvg;
                
                comparisons[company] = {
                    average: companyAvg,
                    ratio: ratio,
                    percentage: Math.min(100, ratio * 100)
                };
            }
        });
        
        return comparisons;
    }

    /**
     * Calculate trend analysis
     */
    calculateTrendAnalysis(userData) {
        if (userData.length < 7) {
            return { hasEnoughData: false };
        }

        const values = userData.map(item => item.activityScore);
        const growthRate = this.calculateGrowthRate(values);
        const volatility = this.calculateStandardDeviation(values);
        const momentum = this.calculateMomentum(values);
        
        return {
            hasEnoughData: true,
            growthRate,
            volatility,
            momentum
        };
    }

    /**
     * Update the entire dashboard with analysis results
     */
    updateDashboard(data) {
        console.log('Updating dashboard with analysis results...');
        
        // Update executive summary metrics
        this.updateExecutiveSummary(data);
        
        // Update main chart
        this.updateMainChart(data);
        
        // Update correlation analysis
        this.updateCorrelationAnalysis(data.weatherCorrelations);
        
        // Update secondary analysis
        this.updateSecondaryAnalysis(data);
        
        // Update insights
        this.updateInsights(data.insights);
        
        // Update data quality metrics
        this.updateDataQuality(data.dataQuality);
        
        // Animate dashboard sections
        this.animateDashboard();
    }

    /**
     * Update executive summary metrics
     */
    updateExecutiveSummary(data) {
        const { performanceAnalysis, weatherCorrelations, trendAnalysis } = data;
        
        // Activity Index
        if (this.elements.activityMetric && performanceAnalysis.hasEnoughData) {
            this.updateMetricCard(this.elements.activityMetric, 
                Math.round(performanceAnalysis.userAverage), 
                `${performanceAnalysis.relativePerformance > 0 ? '+' : ''}${Math.round(performanceAnalysis.relativePerformance)}%`
            );
        }
        
        // Weather Correlation
        if (this.elements.weatherMetric && weatherCorrelations.hasEnoughData) {
            const correlation = Math.abs(weatherCorrelations.precipitation.coefficient || 0);
            this.updateMetricCard(this.elements.weatherMetric, 
                correlation.toFixed(3), 
                correlation > 0.3 ? 'Significant' : 'Weak'
            );
        }
        
        // Performance Ratio
        if (this.elements.performanceMetric && performanceAnalysis.hasEnoughData) {
            this.updateMetricCard(this.elements.performanceMetric, 
                `${Math.round(performanceAnalysis.percentile)}th`, 
                'percentile'
            );
        }
        
        // Consistency Score
        if (this.elements.consistencyMetric && performanceAnalysis.hasEnoughData) {
            this.updateMetricCard(this.elements.consistencyMetric, 
                Math.round(performanceAnalysis.consistencyScore), 
                trendAnalysis.volatility < 20 ? 'Stable' : 'Variable'
            );
        }
    }

    /**
     * Update metric card
     */
    updateMetricCard(cardElement, value, change) {
        const valueElement = cardElement.querySelector('.metric-value');
        const changeElement = cardElement.querySelector('.metric-change');
        
        if (valueElement) {
            valueElement.textContent = value;
            valueElement.classList.add('fade-in');
        }
        
        if (changeElement) {
            changeElement.textContent = change;
        }
    }

    /**
     * Update main chart with comprehensive data
     */
    updateMainChart(data) {
        if (!this.state.charts.main) return;
        
        try {
            const chartData = this.chartRenderer.prepareComprehensiveChartData(
                data.normalizedUserData,
                data.normalizedOrgData,
                data.weatherData
            );
            
            this.chartRenderer.updateChart(chartData);
            console.log('Main chart updated successfully');
        } catch (error) {
            console.error('Failed to update main chart:', error);
        }
    }

    /**
     * Update correlation analysis section
     */
    updateCorrelationAnalysis(correlations) {
        if (!correlations.hasEnoughData) return;
        
        // Precipitation correlation
        if (this.elements.rainCorrelation) {
            const coeff = correlations.precipitation.coefficient || 0;
            this.elements.rainCorrelation.textContent = coeff.toFixed(3);
        }
        
        // Temperature correlation
        if (this.elements.tempCorrelation) {
            const coeff = correlations.temperature.coefficient || 0;
            this.elements.tempCorrelation.textContent = coeff.toFixed(3);
        }
        
        // Seasonal variance
        if (this.elements.seasonalVariance) {
            const variance = correlations.seasonal.variance || 0;
            this.elements.seasonalVariance.textContent = variance.toFixed(2);
        }
    }

    /**
     * Update secondary analysis section
     */
    updateSecondaryAnalysis(data) {
        const { performanceAnalysis, companyComparisons, trendAnalysis } = data;
        
        // Update performance distribution
        if (performanceAnalysis.hasEnoughData) {
            if (this.elements.userPercentile) {
                this.elements.userPercentile.textContent = `${Math.round(performanceAnalysis.percentile)}th`;
            }
            if (this.elements.industryMedian) {
                this.elements.industryMedian.textContent = Math.round(performanceAnalysis.industryAverage);
            }
            if (this.elements.topThreshold) {
                this.elements.topThreshold.textContent = Math.round(performanceAnalysis.industryAverage * 1.5);
            }
        }
        
        // Update company comparisons
        this.updateCompanyComparisons(companyComparisons);
        
        // Update trend analysis
        if (trendAnalysis.hasEnoughData) {
            if (this.elements.growthRate) {
                this.elements.growthRate.textContent = `${trendAnalysis.growthRate > 0 ? '+' : ''}${trendAnalysis.growthRate.toFixed(1)}%`;
            }
            if (this.elements.volatility) {
                this.elements.volatility.textContent = trendAnalysis.volatility.toFixed(1);
            }
            if (this.elements.momentum) {
                this.elements.momentum.textContent = trendAnalysis.momentum > 0 ? 'Positive' : 'Negative';
            }
        }
    }

    /**
     * Update company comparison bars
     */
    updateCompanyComparisons(comparisons) {
        const companies = ['zerodha', 'razorpay', 'postman', 'hasura'];
        
        companies.forEach(company => {
            const comparisonElement = this.elements[`${company}Comparison`];
            const barElement = this.elements[`${company}Bar`];
            
            if (comparisons[company] && comparisonElement && barElement) {
                const { ratio, percentage } = comparisons[company];
                
                comparisonElement.textContent = `${ratio.toFixed(2)}x`;
                
                // Animate bar fill
                setTimeout(() => {
                    barElement.style.width = `${Math.min(100, percentage)}%`;
                }, 500);
            }
        });
    }

    /**
     * Update insights section
     */
    updateInsights(insights) {
        if (!this.elements.insightsContainer || !insights) return;
        
        this.elements.insightsContainer.innerHTML = '';
        
        insights.forEach(insight => {
            const insightCard = this.createInsightCard(insight);
            this.elements.insightsContainer.appendChild(insightCard);
        });
    }

    /**
     * Create insight card element
     */
    createInsightCard(insight) {
        const card = document.createElement('div');
        card.className = 'insight-card';
        
        card.innerHTML = `
            <h3>${insight.title}</h3>
            <p>${insight.message}</p>
            <div class="insight-meta">
                <span class="confidence-level">Confidence: ${Math.round(insight.confidence * 100)}%</span>
                <span class="data-points">${insight.dataPoints} data points</span>
            </div>
        `;
        
        return card;
    }

    /**
     * Update data quality metrics
     */
    updateDataQuality(quality) {
        if (this.elements.dataCompleteness) {
            this.elements.dataCompleteness.textContent = `${Math.round(quality.completeness * 100)}%`;
        }
        if (this.elements.sampleSize) {
            this.elements.sampleSize.textContent = quality.sampleSize;
        }
        if (this.elements.confidenceLevel) {
            this.elements.confidenceLevel.textContent = `${Math.round(quality.confidence * 100)}%`;
        }
    }

    /**
     * Calculate data quality metrics
     */
    calculateDataQuality(userEvents, orgData, weatherData) {
        const totalOrgEvents = Object.values(orgData).flat().length;
        const weatherDays = weatherData.daily.time.length;
        
        const completeness = Math.min(1, (userEvents.length + totalOrgEvents + weatherDays) / 1000);
        const sampleSize = userEvents.length + totalOrgEvents;
        const confidence = Math.min(0.95, sampleSize / 500);
        
        return { completeness, sampleSize, confidence };
    }

    /**
     * Animate dashboard sections
     */
    animateDashboard() {
        const sections = document.querySelectorAll('.metric-card, .analysis-card, .correlation-card');
        
        sections.forEach((section, index) => {
            setTimeout(() => {
                section.classList.add('slide-up');
            }, index * 100);
        });
    }

    /**
     * Utility functions
     */
    calculateCorrelation(dataA, dataB) {
        if (dataA.length !== dataB.length || dataA.length === 0) {
            return { coefficient: 0, significance: 'insufficient-data' };
        }
        
        const n = dataA.length;
        const sumA = dataA.reduce((sum, val) => sum + (val.activityScore || val), 0);
        const sumB = dataB.reduce((sum, val) => sum + val, 0);
        const sumAB = dataA.reduce((sum, val, i) => sum + (val.activityScore || val) * dataB[i], 0);
        const sumA2 = dataA.reduce((sum, val) => sum + Math.pow(val.activityScore || val, 2), 0);
        const sumB2 = dataB.reduce((sum, val) => sum + Math.pow(val, 2), 0);
        
        const numerator = n * sumAB - sumA * sumB;
        const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
        
        const coefficient = denominator === 0 ? 0 : numerator / denominator;
        const significance = Math.abs(coefficient) > 0.3 ? 'significant' : 'weak';
        
        return { coefficient, significance };
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculatePercentile(value, dataset) {
        const sorted = dataset.sort((a, b) => a - b);
        const index = sorted.findIndex(val => val >= value);
        return index === -1 ? 100 : (index / sorted.length) * 100;
    }

    calculateGrowthRate(values) {
        if (values.length < 2) return 0;
        const first = values[0];
        const last = values[values.length - 1];
        return ((last - first) / first) * 100;
    }

    calculateMomentum(values) {
        if (values.length < 7) return 0;
        const recent = values.slice(-7).reduce((sum, val) => sum + val, 0) / 7;
        const earlier = values.slice(0, 7).reduce((sum, val) => sum + val, 0) / 7;
        return recent - earlier;
    }

    calculateSeasonalVariance(userData, weatherData) {
        // Simplified seasonal analysis
        return { variance: Math.random() * 0.5 }; // Placeholder
    }

    /**
     * Input validation
     */
    validateInput() {
        const username = this.elements.usernameInput.value.trim();
        const isValid = this.validateUsername(username, false);
        
        this.elements.analyzeBtn.disabled = !isValid;
        
        return isValid;
    }

    validateUsername(username, showError = true) {
        if (!username) {
            if (showError) this.showError('Please enter a GitHub username');
            return false;
        }
        
        const githubUsernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
        if (!githubUsernameRegex.test(username)) {
            if (showError) this.showError('Please enter a valid GitHub username');
            return false;
        }
        
        return true;
    }

    /**
     * UI state management
     */
    showLoading() {
        this.state.isLoading = true;
        this.elements.loadingIndicator.classList.remove('hidden');
        this.elements.analyzeBtn.disabled = true;
        this.elements.usernameInput.disabled = true;
        
        const btnText = this.elements.analyzeBtn.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = 'Analyzing...';
        }
    }

    hideLoading() {
        this.state.isLoading = false;
        this.elements.loadingIndicator.classList.add('hidden');
        this.elements.analyzeBtn.disabled = false;
        this.elements.usernameInput.disabled = false;
        
        const btnText = this.elements.analyzeBtn.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = 'Analyze';
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
    }

    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    getErrorMessage(error) {
        if (error.message.includes('rate limit')) {
            return 'GitHub API rate limit exceeded. Please try again later.';
        }
        if (error.message.includes('404')) {
            return 'GitHub user not found. Please check the username.';
        }
        return 'Analysis failed. Please try again.';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new BangaloreWeatherIndex();
});

export default BangaloreWeatherIndex;