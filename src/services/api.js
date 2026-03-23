// Mock API Service
export const api = {
  async ask(question) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerQuestion = question.toLowerCase();
    
    // Simulate basic intent detection
    if (lowerQuestion.includes('revenue') || lowerQuestion.includes('sales')) {
      return {
        sql: "SELECT month, SUM(revenue) as total_revenue FROM sales_data GROUP BY month ORDER BY month;",
        data: [
          { month: 'Jan', value: 12000 },
          { month: 'Feb', value: 15000 },
          { month: 'Mar', value: 18000 },
          { month: 'Apr', value: 16000 },
          { month: 'May', value: 21000 },
          { month: 'Jun', value: 25000 }
        ],
        chartType: 'line',
        title: 'Monthly Revenue'
      };
    } else if (lowerQuestion.includes('region') || lowerQuestion.includes('country')) {
      return {
        sql: "SELECT region, COUNT(users) as user_count FROM users_data GROUP BY region;",
        data: [
          { name: 'North America', value: 4500 },
          { name: 'Europe', value: 3200 },
          { name: 'Asia', value: 5100 },
          { name: 'South America', value: 1200 },
          { name: 'Africa', value: 800 }
        ],
        chartType: 'pie',
        title: 'Users by Region'
      };
    } else if (lowerQuestion.includes('product') || lowerQuestion.includes('category')) {
      return {
        sql: "SELECT category, SUM(units_sold) as sold FROM products GROUP BY category ORDER BY sold DESC;",
        data: [
          { category: 'Electronics', value: 850 },
          { category: 'Clothing', value: 620 },
          { category: 'Home', value: 450 },
          { category: 'Sports', value: 310 },
          { category: 'Books', value: 920 }
        ],
        chartType: 'bar',
        title: 'Sales by Category'
      };
    }

    // Default response
    return {
      sql: "SELECT date, active_users FROM daily_metrics ORDER BY date DESC LIMIT 7;",
      data: [
        { date: 'Mon', value: 120 },
        { date: 'Tue', value: 150 },
        { date: 'Wed', value: 180 },
        { date: 'Thu', value: 160 },
        { date: 'Fri', value: 210 },
        { date: 'Sat', value: 250 },
        { date: 'Sun', value: 220 }
      ],
      chartType: 'line',
      title: 'Active Users (Last 7 Days)'
    };
  }
};
