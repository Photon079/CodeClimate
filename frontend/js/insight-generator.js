/**
 * InsightGenerator - Produces "David vs. Goliath" style insights and correlations
 * Analyzes patterns between user activity, industry baseline, and weather conditions
 */

class InsightGenerator {
    constructor() {
        this.minDataPoints = 5; // Minimum data points required for meaningful insights
        this.significanceThreshold = 0.3; // Minimum correlation coefficient for significance
        console.log('💡 InsightGenerator initialized');
    }

    /**
     * Generate comprehensive insights for professional analytics dashboard
     * @param {Object} analysisData - Complete analysis data object
     * @returns {Array} Array of insight objects
     */
    generateComprehensiveInsights(analysisData) {
        const insights = [];
        
        try {
            const {
                userEvents,
                normalizedUserData,
                normalizedOrgData,
                weatherCorrelations,
                performanceAnalysis,
                companyComparisons,
                trendAnalysis
            } = analysisData;

            // Performance insights
            if (performanceAnalysis.hasEnoughData) {
                insights.push(...this.generatePerformanceInsights(performanceAnalysis));
            }

            // Weather correlation insights
            if (weatherCorrelations.hasEnoughData) {
                insights.push(...this.generateWeatherInsights(weatherCorrelations));
            }

            // Company comparison insights
            if (Object.keys(companyComparisons).length > 0) {
                insights.push(...this.generateCompanyInsights(companyComparisons));
            }

            // Trend insights
            if (trendAnalysis.hasEnoughData) {
                insights.push(...this.generateTrendInsights(trendAnalysis));
            }

            // Data quality insights
            insights.push(this.generateDataQualityInsight(userEvents.length, normalizedOrgData.length));

            console.log(`Generated ${insights.length} comprehensive insights`);
            return insights;

        } catch (error) {
            console.error('Failed to generate comprehensive insights:', error);
            return [{
                title: 'Analysis Error',
                message: 'Unable to generate insights due to data processing error.',
                confidence: 0.1,
                dataPoints: 0,
                type: 'error'
            }];
        }
    }

    /**
     * Generate performance-related insights
     */
    generatePerformanceInsights(performanceAnalysis) {
        const insights = [];
        const { relativePerformance, percentile, consistencyScore } = performanceAnalysis;

        // Performance positioning insight
        if (relativePerformance > 25) {
            insights.push({
                title: 'Exceptional Performance',
                message: `Your coding activity is ${Math.round(relativePerformance)}% above the Bangalore tech industry baseline. You're operating at the ${Math.round(percentile)}th percentile, demonstrating exceptional productivity levels.`,
                confidence: 0.9,
                dataPoints: 30,
                type: 'performance-positive'
            });
        } else if (relativePerformance > 0) {
            insights.push({
                title: 'Above Average Performance',
                message: `You're performing ${Math.round(relativePerformance)}% above the industry baseline, placing you in the ${Math.round(percentile)}th percentile. Strong performance with room for optimization.`,
                confidence: 0.8,
                dataPoints: 30,
                type: 'performance-positive'
            });
        } else {
            insights.push({
                title: 'Growth Opportunity',
                message: `Your current activity level is ${Math.abs(Math.round(relativePerformance))}% below the industry baseline. Focus on consistency and gradual improvement to reach the ${Math.round(percentile + 20)}th percentile.`,
                confidence: 0.7,
                dataPoints: 30,
                type: 'performance-improvement'
            });
        }

        // Consistency insight
        if (consistencyScore > 80) {
            insights.push({
                title: 'Excellent Consistency',
                message: `Your consistency score of ${Math.round(consistencyScore)} indicates highly stable productivity patterns. This reliability is a significant competitive advantage in professional development.`,
                confidence: 0.85,
                dataPoints: 30,
                type: 'consistency'
            });
        }

        return insights;
    }

    /**
     * Generate weather correlation insights
     */
    generateWeatherInsights(weatherCorrelations) {
        const insights = [];
        const { precipitation, temperature } = weatherCorrelations;

        // Precipitation insights
        if (precipitation && Math.abs(precipitation.coefficient) > 0.3) {
            const direction = precipitation.coefficient > 0 ? 'increases' : 'decreases';
            const strength = Math.abs(precipitation.coefficient) > 0.5 ? 'strong' : 'moderate';
            
            insights.push({
                title: 'Weather-Productivity Correlation',
                message: `Statistical analysis reveals a ${strength} correlation (r=${precipitation.coefficient.toFixed(3)}) between rainfall and your coding activity. Your productivity ${direction} during rainy days, suggesting weather significantly impacts your work patterns.`,
                confidence: Math.abs(precipitation.coefficient),
                dataPoints: 60,
                type: 'weather-correlation'
            });
        }

        // Temperature insights
        if (temperature && Math.abs(temperature.coefficient) > 0.25) {
            const optimalRange = temperature.coefficient > 0 ? 'warmer temperatures' : 'cooler temperatures';
            
            insights.push({
                title: 'Temperature Sensitivity',
                message: `Your productivity shows sensitivity to temperature variations (r=${temperature.coefficient.toFixed(3)}). Peak performance occurs during ${optimalRange}, indicating environmental factors play a role in your coding efficiency.`,
                confidence: Math.abs(temperature.coefficient),
                dataPoints: 60,
                type: 'temperature-correlation'
            });
        }

        return insights;
    }

    /**
     * Generate company comparison insights
     */
    generateCompanyInsights(companyComparisons) {
        const insights = [];
        
        // Find best and worst comparisons
        const companies = Object.entries(companyComparisons);
        const bestComparison = companies.reduce((best, current) => 
            current[1].ratio > best[1].ratio ? current : best
        );
        const worstComparison = companies.reduce((worst, current) => 
            current[1].ratio < worst[1].ratio ? current : worst
        );

        if (bestComparison[1].ratio > 1.2) {
            insights.push({
                title: 'Company Benchmark Excellence',
                message: `You're outperforming ${bestComparison[0]} by ${((bestComparison[1].ratio - 1) * 100).toFixed(1)}%, demonstrating productivity levels that exceed established unicorn companies. This positions you favorably for senior roles.`,
                confidence: 0.8,
                dataPoints: 25,
                type: 'company-outperform'
            });
        }

        if (worstComparison[1].ratio < 0.8) {
            insights.push({
                title: 'Benchmark Gap Analysis',
                message: `Your activity level is ${((1 - worstComparison[1].ratio) * 100).toFixed(1)}% below ${worstComparison[0]}'s baseline. Focus on increasing daily commit frequency and code review participation to bridge this gap.`,
                confidence: 0.7,
                dataPoints: 25,
                type: 'company-improvement'
            });
        }

        return insights;
    }

    /**
     * Generate trend analysis insights
     */
    generateTrendInsights(trendAnalysis) {
        const insights = [];
        const { growthRate, volatility, momentum } = trendAnalysis;

        // Growth trend insight
        if (growthRate > 10) {
            insights.push({
                title: 'Positive Growth Trajectory',
                message: `Your productivity shows a ${growthRate.toFixed(1)}% growth rate over the analysis period. This upward trend indicates improving development practices and increasing engagement with coding activities.`,
                confidence: 0.8,
                dataPoints: 30,
                type: 'growth-positive'
            });
        } else if (growthRate < -10) {
            insights.push({
                title: 'Declining Activity Pattern',
                message: `Activity has decreased by ${Math.abs(growthRate).toFixed(1)}% over the analysis period. Consider reviewing workload balance, project engagement, or potential burnout factors.`,
                confidence: 0.7,
                dataPoints: 30,
                type: 'growth-concern'
            });
        }

        // Volatility insight
        if (volatility < 15) {
            insights.push({
                title: 'Stable Work Pattern',
                message: `Low volatility (${volatility.toFixed(1)}) indicates consistent daily coding habits. This stability is valuable for long-term project planning and team collaboration.`,
                confidence: 0.8,
                dataPoints: 30,
                type: 'stability'
            });
        }

        return insights;
    }

    /**
     * Generate data quality insight
     */
    generateDataQualityInsight(userDataPoints, industryDataPoints) {
        const totalDataPoints = userDataPoints + industryDataPoints;
        const confidence = Math.min(0.95, totalDataPoints / 1000);
        
        return {
            title: 'Analysis Confidence Level',
            message: `This analysis is based on ${userDataPoints} user events and ${industryDataPoints} industry baseline events. Statistical confidence level: ${Math.round(confidence * 100)}%. Larger datasets improve accuracy of insights and correlations.`,
            confidence: confidence,
            dataPoints: totalDataPoints,
            type: 'data-quality'
        };
    }

    /**
     * Calculate relative performance between user and baseline data
     * @param {Array} userData - User activity data with activityScore
     * @param {Array} baselineData - Industry baseline data with activityScore
     * @returns {Object} Relative performance analysis
     */
    calculateRelativePerformance(userData, baselineData) {
        if (!Array.isArray(userData) || !Array.isArray(baselineData)) {
            throw new Error('User data and baseline data must be arrays');
        }

        console.log('📊 Calculating relative performance (David vs. Goliath)');

        // Synchronize data by date for comparison
        const synchronizedData = this.synchronizeDataByDate(userData, baselineData);
        
        if (synchronizedData.length < this.minDataPoints) {
            return {
                hasEnoughData: false,
                dataPoints: synchronizedData.length,
                message: `Need at least ${this.minDataPoints} data points for meaningful comparison. Currently have ${synchronizedData.length}.`
            };
        }

        // Calculate performance metrics
        const userScores = synchronizedData.map(item => item.userScore || 0);
        const baselineScores = synchronizedData.map(item => item.baselineScore || 0);
        
        const userAvg = this.calculateMean(userScores);
        const baselineAvg = this.calculateMean(baselineScores);
        
        const performanceRatio = baselineAvg > 0 ? (userAvg / baselineAvg) : 0;
        const performancePercentage = Math.round((performanceRatio - 1) * 100);
        
        // Calculate consistency metrics
        const userConsistency = this.calculateConsistency(userScores);
        const baselineConsistency = this.calculateConsistency(baselineScores);
        
        // Determine performance category
        const category = this.categorizePerformance(performanceRatio);
        
        // Calculate days where user outperformed baseline
        const outperformDays = synchronizedData.filter(item => 
            (item.userScore || 0) > (item.baselineScore || 0)
        ).length;
        const outperformPercentage = Math.round((outperformDays / synchronizedData.length) * 100);

        return {
            hasEnoughData: true,
            dataPoints: synchronizedData.length,
            userAverage: parseFloat(userAvg.toFixed(1)),
            baselineAverage: parseFloat(baselineAvg.toFixed(1)),
            performanceRatio: parseFloat(performanceRatio.toFixed(2)),
            performancePercentage: performancePercentage,
            category: category,
            userConsistency: parseFloat(userConsistency.toFixed(2)),
            baselineConsistency: parseFloat(baselineConsistency.toFixed(2)),
            outperformDays: outperformDays,
            outperformPercentage: outperformPercentage,
            synchronizedData: synchronizedData
        };
    }

    /**
     * Find correlations between activity and weather patterns
     * @param {Array} activityData - Activity data with weather information
     * @param {Object} options - Analysis options
     * @returns {Object} Weather correlation analysis
     */
    findWeatherCorrelations(activityData, options = {}) {
        if (!Array.isArray(activityData)) {
            throw new Error('Activity data must be an array');
        }

        console.log('🌤️ Analyzing weather correlations');

        // Filter data with weather information
        const weatherData = activityData.filter(item => 
            item.weather && 
            item.weather.maxTemp !== null && 
            item.weather.rainfall !== undefined &&
            item.activityScore !== undefined
        );

        if (weatherData.length < this.minDataPoints) {
            return {
                hasEnoughData: false,
                dataPoints: weatherData.length,
                message: `Need at least ${this.minDataPoints} data points with weather information. Currently have ${weatherData.length}.`
            };
        }

        // Calculate correlations
        const temperatureCorrelation = this.calculateCorrelation(
            weatherData.map(item => item.weather.maxTemp),
            weatherData.map(item => item.activityScore)
        );

        const rainfallCorrelation = this.calculateCorrelation(
            weatherData.map(item => item.weather.rainfall),
            weatherData.map(item => item.activityScore)
        );

        // Analyze activity by weather conditions
        const conditionAnalysis = this.analyzeActivityByConditions(weatherData);

        // Find optimal weather conditions
        const optimalConditions = this.findOptimalWeatherConditions(weatherData);

        return {
            hasEnoughData: true,
            dataPoints: weatherData.length,
            temperatureCorrelation: {
                coefficient: parseFloat(temperatureCorrelation.toFixed(3)),
                strength: this.interpretCorrelationStrength(temperatureCorrelation),
                isSignificant: Math.abs(temperatureCorrelation) >= this.significanceThreshold
            },
            rainfallCorrelation: {
                coefficient: parseFloat(rainfallCorrelation.toFixed(3)),
                strength: this.interpretCorrelationStrength(rainfallCorrelation),
                isSignificant: Math.abs(rainfallCorrelation) >= this.significanceThreshold
            },
            conditionAnalysis: conditionAnalysis,
            optimalConditions: optimalConditions
        };
    }

    /**
     * Generate personalized insights based on correlations and performance
     * @param {Object} performanceData - Relative performance analysis
     * @param {Object} weatherCorrelations - Weather correlation analysis
     * @param {Object} options - Generation options
     * @returns {Array} Array of insight objects
     */
    generatePersonalizedInsights(performanceData, weatherCorrelations, options = {}) {
        console.log('💭 Generating personalized insights');

        const insights = [];

        // Performance insights
        if (performanceData.hasEnoughData) {
            insights.push(...this.generatePerformanceInsights(performanceData));
        }

        // Weather insights
        if (weatherCorrelations.hasEnoughData) {
            insights.push(...this.generateWeatherInsights(weatherCorrelations, performanceData));
        }

        // Encouraging messages for insufficient data
        if (!performanceData.hasEnoughData || !weatherCorrelations.hasEnoughData) {
            insights.push(...this.generateEncouragingMessages(performanceData, weatherCorrelations));
        }

        // Sort insights by confidence and relevance
        insights.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

        console.log(`✅ Generated ${insights.length} personalized insights`);
        return insights;
    }

    /**
     * Generate performance-based insights
     * @param {Object} performanceData - Performance analysis data
     * @returns {Array} Performance insights
     */
    generatePerformanceInsights(performanceData) {
        const insights = [];
        const { category, performancePercentage, outperformPercentage, userConsistency, baselineConsistency } = performanceData;

        // Main performance insight
        if (category === 'outperforming') {
            insights.push({
                type: 'performance_comparison',
                title: '🚀 David Beats Goliath!',
                message: `You're coding ${Math.abs(performancePercentage)}% more intensely than the Bangalore tech giants! Your average activity score of ${performanceData.userAverage}% outshines the industry baseline of ${performanceData.baselineAverage}%.`,
                confidence: 0.9,
                category: 'positive',
                dataPoints: performanceData.dataPoints
            });
        } else if (category === 'matching') {
            insights.push({
                type: 'performance_comparison',
                title: '⚖️ Neck and Neck with Giants',
                message: `You're keeping pace with the Bangalore tech unicorns! Your activity level matches the industry standard, showing you're right in the competitive zone.`,
                confidence: 0.8,
                category: 'neutral',
                dataPoints: performanceData.dataPoints
            });
        } else {
            insights.push({
                type: 'performance_comparison',
                title: '🎯 Room for Growth',
                message: `The Bangalore tech giants are currently ${Math.abs(performancePercentage)}% ahead, but that's your opportunity! Every coding session gets you closer to unicorn-level productivity.`,
                confidence: 0.8,
                category: 'motivational',
                dataPoints: performanceData.dataPoints
            });
        }

        // Consistency insight
        if (userConsistency > baselineConsistency * 1.2) {
            insights.push({
                type: 'consistency_analysis',
                title: '📈 Consistency Champion',
                message: `Your coding consistency (${userConsistency}) is ${Math.round(((userConsistency / baselineConsistency) - 1) * 100)}% better than the industry average. Steady progress beats sporadic bursts!`,
                confidence: 0.7,
                category: 'positive',
                dataPoints: performanceData.dataPoints
            });
        }

        // Outperform days insight
        if (outperformPercentage >= 60) {
            insights.push({
                type: 'dominance_analysis',
                title: '👑 Frequent Winner',
                message: `You outperformed the industry baseline on ${outperformPercentage}% of days. You're not just competing with unicorns—you're often beating them!`,
                confidence: 0.8,
                category: 'positive',
                dataPoints: performanceData.dataPoints
            });
        }

        return insights;
    }

    /**
     * Generate weather-based insights
     * @param {Object} weatherCorrelations - Weather correlation data
     * @param {Object} performanceData - Performance data for context
     * @returns {Array} Weather insights
     */
    generateWeatherInsights(weatherCorrelations, performanceData) {
        const insights = [];
        const { temperatureCorrelation, rainfallCorrelation, conditionAnalysis, optimalConditions } = weatherCorrelations;

        // Temperature correlation insight
        if (temperatureCorrelation.isSignificant) {
            const direction = temperatureCorrelation.coefficient > 0 ? 'hotter' : 'cooler';
            const intensity = Math.abs(temperatureCorrelation.coefficient) > 0.5 ? 'significantly' : 'moderately';
            
            insights.push({
                type: 'weather_correlation',
                title: '🌡️ Temperature Sweet Spot',
                message: `You code ${intensity} more when it's ${direction}! Temperature correlation: ${temperatureCorrelation.coefficient}. ${direction === 'hotter' ? 'Heat fuels your productivity' : 'Cool weather keeps you focused'}.`,
                confidence: Math.abs(temperatureCorrelation.coefficient),
                category: 'analytical',
                dataPoints: weatherCorrelations.dataPoints
            });
        }

        // Rainfall correlation insight
        if (rainfallCorrelation.isSignificant) {
            const direction = rainfallCorrelation.coefficient > 0 ? 'more' : 'less';
            const weatherType = rainfallCorrelation.coefficient > 0 ? 'rainy' : 'dry';
            
            insights.push({
                type: 'weather_correlation',
                title: '🌧️ Rain Effect',
                message: `Rainy days make you code ${direction}! On ${weatherType} days, you're ${Math.round(Math.abs(rainfallCorrelation.coefficient) * 100)}% more productive than average.`,
                confidence: Math.abs(rainfallCorrelation.coefficient),
                category: 'analytical',
                dataPoints: weatherCorrelations.dataPoints
            });
        }

        // Optimal conditions insight
        if (optimalConditions.condition !== 'unknown') {
            const avgScore = optimalConditions.averageScore;
            insights.push({
                type: 'optimal_conditions',
                title: '⭐ Your Coding Weather',
                message: `You peak during ${optimalConditions.condition.replace('_', ' ')} weather with an average activity score of ${avgScore}%. Plan your intense coding sessions accordingly!`,
                confidence: 0.7,
                category: 'actionable',
                dataPoints: optimalConditions.dataPoints
            });
        }

        return insights;
    }

    /**
     * Generate encouraging messages for insufficient data
     * @param {Object} performanceData - Performance data
     * @param {Object} weatherCorrelations - Weather correlation data
     * @returns {Array} Encouraging insights
     */
    generateEncouragingMessages(performanceData, weatherCorrelations) {
        const insights = [];

        if (!performanceData.hasEnoughData) {
            insights.push({
                type: 'data_collection',
                title: '📊 Building Your Profile',
                message: `Keep coding! We need ${this.minDataPoints - performanceData.dataPoints} more days of activity to unlock your David vs. Goliath insights. Every commit counts!`,
                confidence: 1.0,
                category: 'motivational',
                dataPoints: performanceData.dataPoints
            });
        }

        if (!weatherCorrelations.hasEnoughData) {
            insights.push({
                type: 'weather_tracking',
                title: '🌤️ Weather Patterns Loading',
                message: `We're tracking your weather-coding patterns! ${this.minDataPoints - weatherCorrelations.dataPoints} more days and we'll reveal how Bangalore's weather affects your productivity.`,
                confidence: 1.0,
                category: 'informational',
                dataPoints: weatherCorrelations.dataPoints
            });
        }

        return insights;
    }

    /**
     * Synchronize user and baseline data by date
     * @param {Array} userData - User activity data
     * @param {Array} baselineData - Baseline activity data
     * @returns {Array} Synchronized data points
     */
    synchronizeDataByDate(userData, baselineData) {
        const userLookup = {};
        const baselineLookup = {};

        userData.forEach(item => {
            if (item.date) {
                userLookup[item.date] = item.activityScore || 0;
            }
        });

        baselineData.forEach(item => {
            if (item.date) {
                baselineLookup[item.date] = item.activityScore || 0;
            }
        });

        const allDates = new Set([...Object.keys(userLookup), ...Object.keys(baselineLookup)]);
        
        return Array.from(allDates).map(date => ({
            date: date,
            userScore: userLookup[date] || 0,
            baselineScore: baselineLookup[date] || 0
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Calculate Pearson correlation coefficient
     * @param {Array} x - First dataset
     * @param {Array} y - Second dataset
     * @returns {number} Correlation coefficient (-1 to 1)
     */
    calculateCorrelation(x, y) {
        if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length === 0) {
            return 0;
        }

        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Calculate mean of an array
     * @param {Array} values - Numeric values
     * @returns {number} Mean value
     */
    calculateMean(values) {
        if (!Array.isArray(values) || values.length === 0) {
            return 0;
        }
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Calculate consistency (inverse of coefficient of variation)
     * @param {Array} values - Numeric values
     * @returns {number} Consistency score (higher = more consistent)
     */
    calculateConsistency(values) {
        if (!Array.isArray(values) || values.length === 0) {
            return 0;
        }

        const mean = this.calculateMean(values);
        if (mean === 0) return 0;

        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;

        return Math.max(0, 1 - coefficientOfVariation); // Higher score = more consistent
    }

    /**
     * Categorize performance relative to baseline
     * @param {number} ratio - Performance ratio (user/baseline)
     * @returns {string} Performance category
     */
    categorizePerformance(ratio) {
        if (ratio >= 1.15) return 'outperforming';
        if (ratio >= 0.85) return 'matching';
        return 'underperforming';
    }

    /**
     * Interpret correlation strength
     * @param {number} coefficient - Correlation coefficient
     * @returns {string} Strength description
     */
    interpretCorrelationStrength(coefficient) {
        const abs = Math.abs(coefficient);
        if (abs >= 0.7) return 'strong';
        if (abs >= 0.5) return 'moderate';
        if (abs >= 0.3) return 'weak';
        return 'negligible';
    }

    /**
     * Analyze activity by weather conditions
     * @param {Array} weatherData - Data with weather conditions
     * @returns {Object} Analysis by condition
     */
    analyzeActivityByConditions(weatherData) {
        const conditionGroups = {};

        weatherData.forEach(item => {
            const condition = item.weather.conditions || 'unknown';
            if (!conditionGroups[condition]) {
                conditionGroups[condition] = [];
            }
            conditionGroups[condition].push(item.activityScore);
        });

        const analysis = {};
        Object.keys(conditionGroups).forEach(condition => {
            const scores = conditionGroups[condition];
            analysis[condition] = {
                count: scores.length,
                averageScore: parseFloat(this.calculateMean(scores).toFixed(1)),
                consistency: parseFloat(this.calculateConsistency(scores).toFixed(2))
            };
        });

        return analysis;
    }

    /**
     * Find optimal weather conditions for productivity
     * @param {Array} weatherData - Data with weather information
     * @returns {Object} Optimal conditions analysis
     */
    findOptimalWeatherConditions(weatherData) {
        const conditionAnalysis = this.analyzeActivityByConditions(weatherData);
        
        let bestCondition = 'unknown';
        let bestScore = 0;
        let bestCount = 0;

        Object.keys(conditionAnalysis).forEach(condition => {
            const analysis = conditionAnalysis[condition];
            // Require at least 2 data points and prioritize higher scores
            if (analysis.count >= 2 && analysis.averageScore > bestScore) {
                bestCondition = condition;
                bestScore = analysis.averageScore;
                bestCount = analysis.count;
            }
        });

        return {
            condition: bestCondition,
            averageScore: bestScore,
            dataPoints: bestCount,
            allConditions: conditionAnalysis
        };
    }
}

// Export for use in other modules
export default InsightGenerator;