/**
 * Bangalore Weather Index - Simple Version (No ES6 Modules)
 * Professional Analytics Dashboard
 */

class BangaloreWeatherIndex {
    constructor() {
        console.log('Initializing Bangalore Weather Index...');
        
        // Application state
        this.state = {
            isLoading: false,
            currentUser: null,
            analysisData: null
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
            this.showWelcomeMessage();
            
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
            
            // Metric elements
            activityMetric: document.getElementById('activity-metric'),
            weatherMetric: document.getElementById('weather-metric'),
            performanceMetric: document.getElementById('performance-metric'),
            consistencyMetric: document.getElementById('consistency-metric'),
            
            // Insights container
            insightsContainer: document.getElementById('insights-container')
        };

        // Validate critical elements
        const criticalElements = ['usernameInput', 'analyzeBtn', 'insightsContainer'];
        const missingElements = criticalElements.filter(key => !this.elements[key]);
        
        if (missingElements.length > 0) {
            throw new Error(`Critical elements missing: ${missingElements.join(', ')}`);
        }
        
        console.log('DOM elements initialized successfully');
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
        
        console.log('Event listeners set up successfully');
    }

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        if (this.elements.insightsContainer) {
            this.elements.insightsContainer.innerHTML = `
                <div class="insight-card">
                    <h3>Welcome to Bangalore Weather Index</h3>
                    <p>Enter your GitHub username above to start analyzing your coding productivity patterns against Bangalore's tech ecosystem and weather correlations.</p>
                    <div class="insight-meta">
                        <span class="confidence-level">Ready for analysis</span>
                        <span class="data-points">Professional analytics platform</span>
                    </div>
                </div>
                <div class="insight-card">
                    <h3>What You'll Get</h3>
                    <p>• Comprehensive weather correlation analysis<br>
                       • Performance benchmarking against unicorn companies<br>
                       • Statistical significance testing<br>
                       • Professional insights and recommendations</p>
                    <div class="insight-meta">
                        <span class="confidence-level">Data-driven insights</span>
                        <span class="data-points">Statistical analysis</span>
                    </div>
                </div>
            `;
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
            
            // Simulate analysis process
            await this.simulateAnalysis(username);
            
            console.log('Analysis completed successfully');
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Simulate analysis process (placeholder for real implementation)
     */
    async simulateAnalysis(username) {
        // Simulate API calls and data processing
        await this.delay(2000);
        
        // Update metrics with sample data
        this.updateSampleMetrics();
        
        // Show sample insights
        this.showSampleInsights(username);
    }

    /**
     * Update metrics with sample data
     */
    updateSampleMetrics() {
        // Activity Index
        if (this.elements.activityMetric) {
            this.updateMetricCard(this.elements.activityMetric, '85', '+12% vs Industry');
        }
        
        // Weather Correlation
        if (this.elements.weatherMetric) {
            this.updateMetricCard(this.elements.weatherMetric, '0.67', 'Significant');
        }
        
        // Performance Ratio
        if (this.elements.performanceMetric) {
            this.updateMetricCard(this.elements.performanceMetric, '78th', 'percentile');
        }
        
        // Consistency Score
        if (this.elements.consistencyMetric) {
            this.updateMetricCard(this.elements.consistencyMetric, '92', 'Stable');
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
     * Show sample insights
     */
    showSampleInsights(username) {
        if (!this.elements.insightsContainer) return;
        
        this.elements.insightsContainer.innerHTML = `
            <div class="insight-card">
                <h3>Weather-Productivity Correlation</h3>
                <p>Statistical analysis reveals a strong correlation (r=0.67) between rainfall and ${username}'s coding activity. Productivity increases during rainy days, suggesting weather significantly impacts work patterns.</p>
                <div class="insight-meta">
                    <span class="confidence-level">Confidence: 89%</span>
                    <span class="data-points">60 data points</span>
                </div>
            </div>
            
            <div class="insight-card">
                <h3>Above Average Performance</h3>
                <p>${username} is performing 12% above the Bangalore tech industry baseline, placing in the 78th percentile. Strong performance with room for optimization.</p>
                <div class="insight-meta">
                    <span class="confidence-level">Confidence: 85%</span>
                    <span class="data-points">30 data points</span>
                </div>
            </div>
            
            <div class="insight-card">
                <h3>Excellent Consistency</h3>
                <p>Consistency score of 92 indicates highly stable productivity patterns. This reliability is a significant competitive advantage in professional development.</p>
                <div class="insight-meta">
                    <span class="confidence-level">Confidence: 91%</span>
                    <span class="data-points">30 data points</span>
                </div>
            </div>
            
            <div class="insight-card">
                <h3>Company Benchmark Excellence</h3>
                <p>${username} is outperforming Zerodha by 1.3x, demonstrating productivity levels that exceed established unicorn companies. This positions favorably for senior roles.</p>
                <div class="insight-meta">
                    <span class="confidence-level">Confidence: 82%</span>
                    <span class="data-points">25 data points</span>
                </div>
            </div>
            
            <div class="insight-card">
                <h3>Temperature Sensitivity</h3>
                <p>Productivity shows sensitivity to temperature variations (r=-0.34). Peak performance occurs during cooler temperatures, indicating environmental factors play a role in coding efficiency.</p>
                <div class="insight-meta">
                    <span class="confidence-level">Confidence: 76%</span>
                    <span class="data-points">60 data points</span>
                </div>
            </div>
            
            <div class="insight-card">
                <h3>Analysis Confidence Level</h3>
                <p>This analysis is based on 247 user events and 1,000 industry baseline events. Statistical confidence level: 89%. Larger datasets improve accuracy of insights and correlations.</p>
                <div class="insight-meta">
                    <span class="confidence-level">High confidence</span>
                    <span class="data-points">1,247 total events</span>
                </div>
            </div>
        `;
        
        // Animate cards
        const cards = this.elements.insightsContainer.querySelectorAll('.insight-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('slide-up');
            }, index * 100);
        });
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
        return 'Analysis failed. Please try again.';
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    new BangaloreWeatherIndex();
});

console.log('Script loaded successfully');