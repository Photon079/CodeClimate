/**
 * Analytics UI Module - Display analytics and insights
 */

import { 
  calculateRevenueTrends, 
  calculateClientStats, 
  calculateCollectionEfficiency,
  generateInsights,
  calculateForecast
} from './analytics.js';
import { formatCurrency } from './formatter.js';

/**
 * Show analytics dashboard
 * @param {Array} invoices - Array of invoices
 */
export function showAnalyticsDashboard(invoices) {
  const trends = calculateRevenueTrends(invoices);
  const clientStats = calculateClientStats(invoices);
  const efficiency = calculateCollectionEfficiency(invoices);
  const insights = generateInsights(invoices);
  const forecast = calculateForecast(invoices);
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm';
  
  modal.innerHTML = `
    <div class="min-h-screen px-4 py-8">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">📊 Analytics Dashboard</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Insights and performance metrics</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-all">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <!-- Key Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Revenue</div>
                <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">${formatCurrency(trends.totalRevenue)}</div>
                <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">From paid invoices</div>
              </div>
              
              <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div class="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Collection Rate</div>
                <div class="text-2xl font-bold text-green-900 dark:text-green-100">${efficiency.collectionRate.toFixed(1)}%</div>
                <div class="text-xs text-green-600 dark:text-green-400 mt-1">${efficiency.paidInvoices} of ${efficiency.totalInvoices} paid</div>
              </div>
              
              <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div class="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Avg. Payment Time</div>
                <div class="text-2xl font-bold text-purple-900 dark:text-purple-100">${efficiency.averageDaysToPayment} days</div>
                <div class="text-xs text-purple-600 dark:text-purple-400 mt-1">Time to receive payment</div>
              </div>
            </div>
            
            <!-- Insights -->
            ${insights.length > 0 ? `
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">💡 Insights & Recommendations</h3>
                <div class="space-y-3">
                  ${insights.map(insight => `
                    <div class="bg-${insight.type === 'warning' ? 'amber' : insight.type === 'success' ? 'green' : 'blue'}-50 dark:bg-${insight.type === 'warning' ? 'amber' : insight.type === 'success' ? 'green' : 'blue'}-900/20 border border-${insight.type === 'warning' ? 'amber' : insight.type === 'success' ? 'green' : 'blue'}-200 dark:border-${insight.type === 'warning' ? 'amber' : insight.type === 'success' ? 'green' : 'blue'}-800 rounded-lg p-4">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">${insight.type === 'warning' ? '⚠️' : insight.type === 'success' ? '✅' : 'ℹ️'}</span>
                        <div class="flex-1">
                          <div class="font-semibold text-gray-900 dark:text-white">${insight.title}</div>
                          <div class="text-sm text-gray-700 dark:text-gray-300 mt-1">${insight.message}</div>
                          <div class="text-xs text-gray-600 dark:text-gray-400 mt-2">💡 ${insight.action}</div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Top Clients -->
            ${clientStats.topClients.length > 0 ? `
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">🏆 Top Clients</h3>
                <div class="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                  <table class="w-full">
                    <thead class="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Client</th>
                        <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Invoices</th>
                        <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Total</th>
                        <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Paid</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                      ${clientStats.topClients.map((client, index) => `
                        <tr class="hover:bg-gray-100 dark:hover:bg-gray-800">
                          <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            <span class="inline-flex items-center gap-2">
                              <span class="text-lg">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}</span>
                              ${client.name}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">${client.totalInvoices}</td>
                          <td class="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">${formatCurrency(client.totalAmount)}</td>
                          <td class="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">${formatCurrency(client.paidAmount)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}
            
            <!-- Forecast -->
            ${forecast.invoiceCount > 0 ? `
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">🔮 Next Month Forecast</h3>
                <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div class="text-sm text-indigo-700 dark:text-indigo-300">Expected Revenue</div>
                      <div class="text-xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">${formatCurrency(forecast.expectedRevenue)}</div>
                    </div>
                    <div>
                      <div class="text-sm text-purple-700 dark:text-purple-300">Projected Revenue</div>
                      <div class="text-xl font-bold text-purple-900 dark:text-purple-100 mt-1">${formatCurrency(forecast.projectedRevenue)}</div>
                      <div class="text-xs text-purple-600 dark:text-purple-400 mt-1">Based on ${forecast.collectionRate.toFixed(0)}% collection rate</div>
                    </div>
                    <div>
                      <div class="text-sm text-pink-700 dark:text-pink-300">Invoices Due</div>
                      <div class="text-xl font-bold text-pink-900 dark:text-pink-100 mt-1">${forecast.invoiceCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export default {
  showAnalyticsDashboard
};
