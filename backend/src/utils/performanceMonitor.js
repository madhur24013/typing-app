const { logError, logInfo } = require('./logger');
const os = require('os');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      resourceUsage: [],
      errors: [],
      alerts: [],
      slowQueries: [],
      memoryLeaks: []
    };
    this.startTime = Date.now();
    this.lastMemoryUsage = process.memoryUsage();
    this.memoryThreshold = 0.8; // 80% memory usage threshold
    this.slowQueryThreshold = 1000; // 1 second
    this.alertThresholds = {
      cpu: 0.8, // 80% CPU usage
      memory: 0.8, // 80% memory usage
      errorRate: 0.1, // 10% error rate
      responseTime: 2000 // 2 seconds
    };
  }

  /**
   * Track API call performance
   * @param {string} endpoint - API endpoint identifier
   * @param {number} duration - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   * @param {Object} metadata - Additional metadata
   */
  trackApiCall(endpoint, duration, statusCode, metadata = {}) {
    const stats = this.metrics.apiCalls.get(endpoint) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      statusCodes: new Map(),
      errors: 0,
      lastErrors: [],
      slowRequests: []
    };

    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    const statusCount = stats.statusCodes.get(statusCode) || 0;
    stats.statusCodes.set(statusCode, statusCount + 1);

    if (statusCode >= 400) {
      stats.errors++;
      stats.lastErrors.push({
        timestamp: Date.now(),
        statusCode,
        duration,
        ...metadata
      });
      
      // Keep only last 10 errors
      if (stats.lastErrors.length > 10) {
        stats.lastErrors.shift();
      }
    }

    if (duration > this.slowQueryThreshold) {
      stats.slowRequests.push({
        timestamp: Date.now(),
        duration,
        ...metadata
      });
      
      // Keep only last 10 slow requests
      if (stats.slowRequests.length > 10) {
        stats.slowRequests.shift();
      }
    }

    this.metrics.apiCalls.set(endpoint, stats);

    // Check for performance issues
    this.checkPerformanceIssues(endpoint, stats);
  }

  /**
   * Track resource usage
   */
  trackResourceUsage() {
    const usage = {
      timestamp: Date.now(),
      cpu: {
        loadAvg: os.loadavg(),
        uptime: os.uptime(),
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      },
      uptime: process.uptime()
    };

    this.metrics.resourceUsage.push(usage);

    // Keep only last 100 measurements
    if (this.metrics.resourceUsage.length > 100) {
      this.metrics.resourceUsage.shift();
    }

    // Check for memory leaks
    this.checkMemoryLeaks(usage);

    // Check for high resource usage
    this.checkResourceUsage(usage);
  }

  /**
   * Check for memory leaks
   * @param {Object} usage - Current resource usage
   */
  checkMemoryLeaks(usage) {
    const currentHeap = usage.memory.heapUsed;
    const previousHeap = this.lastMemoryUsage.heapUsed;
    const heapGrowth = (currentHeap - previousHeap) / previousHeap;

    if (heapGrowth > 0.1) { // 10% growth
      this.metrics.memoryLeaks.push({
        timestamp: Date.now(),
        growth: heapGrowth,
        currentHeap,
        previousHeap
      });

      if (this.metrics.memoryLeaks.length > 10) {
        this.metrics.memoryLeaks.shift();
      }

      logInfo('Potential memory leak detected:', {
        growth: `${(heapGrowth * 100).toFixed(2)}%`,
        currentHeap: `${(currentHeap / 1024 / 1024).toFixed(2)}MB`,
        previousHeap: `${(previousHeap / 1024 / 1024).toFixed(2)}MB`
      });
    }

    this.lastMemoryUsage = process.memoryUsage();
  }

  /**
   * Check for high resource usage
   * @param {Object} usage - Current resource usage
   */
  checkResourceUsage(usage) {
    const cpuUsage = usage.cpu.loadAvg[0] / usage.cpu.cores;
    const memoryUsage = usage.memory.used / usage.memory.total;

    if (cpuUsage > this.alertThresholds.cpu) {
      this.addAlert('high_cpu', {
        usage: cpuUsage,
        threshold: this.alertThresholds.cpu
      });
    }

    if (memoryUsage > this.alertThresholds.memory) {
      this.addAlert('high_memory', {
        usage: memoryUsage,
        threshold: this.alertThresholds.memory
      });
    }
  }

  /**
   * Check for performance issues
   * @param {string} endpoint - API endpoint
   * @param {Object} stats - Endpoint statistics
   */
  checkPerformanceIssues(endpoint, stats) {
    const errorRate = stats.errors / stats.count;
    const avgResponseTime = stats.avgDuration;

    if (errorRate > this.alertThresholds.errorRate) {
      this.addAlert('high_error_rate', {
        endpoint,
        errorRate,
        threshold: this.alertThresholds.errorRate
      });
    }

    if (avgResponseTime > this.alertThresholds.responseTime) {
      this.addAlert('slow_response_time', {
        endpoint,
        avgResponseTime,
        threshold: this.alertThresholds.responseTime
      });
    }
  }

  /**
   * Add an alert
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   */
  addAlert(type, data) {
    const alert = {
      type,
      timestamp: Date.now(),
      data
    };

    this.metrics.alerts.push(alert);

    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts.shift();
    }

    logInfo('Performance alert:', alert);
  }

  /**
   * Track error occurrence
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  trackError(error, context) {
    const errorInfo = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context,
      uptime: process.uptime()
    };

    this.metrics.errors.push(errorInfo);

    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }

    logError('Error tracked:', errorInfo);
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const currentResourceUsage = this.metrics.resourceUsage[this.metrics.resourceUsage.length - 1] || {};

    // Calculate overall statistics
    const totalApiCalls = Array.from(this.metrics.apiCalls.values())
      .reduce((sum, stats) => sum + stats.count, 0);
    const totalErrors = Array.from(this.metrics.apiCalls.values())
      .reduce((sum, stats) => sum + stats.errors, 0);
    const errorRate = totalApiCalls > 0 ? totalErrors / totalApiCalls : 0;

    return {
      uptime,
      apiCalls: Array.from(this.metrics.apiCalls.entries()).map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
        statusCodes: Object.fromEntries(stats.statusCodes)
      })),
      resourceUsage: currentResourceUsage,
      errorCount: this.metrics.errors.length,
      recentErrors: this.metrics.errors.slice(-5),
      alerts: this.metrics.alerts.slice(-5),
      slowQueries: this.metrics.slowQueries.slice(-5),
      memoryLeaks: this.metrics.memoryLeaks.slice(-5),
      overallStats: {
        totalApiCalls,
        totalErrors,
        errorRate,
        avgResponseTime: Array.from(this.metrics.apiCalls.values())
          .reduce((sum, stats) => sum + stats.avgDuration, 0) / this.metrics.apiCalls.size || 0
      }
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      apiCalls: new Map(),
      resourceUsage: [],
      errors: [],
      alerts: [],
      slowQueries: [],
      memoryLeaks: []
    };
    this.startTime = Date.now();
    this.lastMemoryUsage = process.memoryUsage();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export middleware for tracking API performance
const trackPerformance = (req, res, next) => {
  const start = Date.now();

  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    performanceMonitor.trackApiCall(
      req.originalUrl,
      duration,
      res.statusCode,
      {
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        query: req.query,
        params: req.params
      }
    );
  });

  next();
};

module.exports = {
  performanceMonitor,
  trackPerformance
}; 