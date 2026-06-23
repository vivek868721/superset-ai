require('dotenv').config();

const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const SUPERSET_URL = process.env.SUPERSET_URL;
const USERNAME = process.env.SUPERSET_USERNAME;
const PASSWORD = process.env.SUPERSET_PASSWORD;
const DATABASE_ID = process.env.SUPERSET_DATABASE_ID;
const DATASET_ID = parseInt(process.env.DATASET_ID) || 16;

// 🔐 Login
async function login() {
    const res = await client.post(`${SUPERSET_URL}/api/v1/security/login`, {
        username: USERNAME,
        password: PASSWORD,
        provider: "db",
        refresh: true
    });
    return res.data.access_token;
}

// 🛡️ CSRF
async function getCSRFToken(token) {
    const res = await client.get(
        `${SUPERSET_URL}/api/v1/security/csrf_token/`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    return res.data.result;
}

// 🧠 SQL
async function runSQL(sql) {
    const token = await login();
    const csrfToken = await getCSRFToken(token);

    const res = await client.post(
        `${SUPERSET_URL}/api/v1/sqllab/execute/`,
        {
            database_id: parseInt(DATABASE_ID),
            sql,
            schema: "main",
            runAsync: false,
            expand_data: true
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-CSRFToken": csrfToken
            }
        }
    );

    return { data: res.data, token, csrfToken };
}

// 📊 Create Chart
async function createChart(token, csrfToken, config = {}) {
    const chartType = config.chartType || "bar";
    const groupby = (config.groupby && config.groupby.length) ? config.groupby : ["name"];

    const limitMatch = config.sql?.match(/limit\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;

    // Single adhoc metric: SUM(num)
    const metric = {
        expressionType: "SQL",
        sqlExpression: "SUM(num)",
        label: "total"
    };

    const base = {
        datasource: `${DATASET_ID}__table`,
        row_limit: limit,
        color_scheme: "supersetColors"
    };

    // Map friendly chart type -> a valid Superset 6 viz_type + form_data
    let vizType;
    let form_data;

    if (chartType === "pie") {
        vizType = "pie";
        form_data = {
            ...base,
            viz_type: vizType,
            groupby,
            metric
        };
    } else if (chartType === "line") {
        vizType = "echarts_timeseries_line";
        form_data = {
            ...base,
            viz_type: vizType,
            x_axis: groupby[0],
            groupby: [],
            metrics: [metric]
        };
    } else {
        // bar + anything else -> categorical bar
        vizType = "echarts_timeseries_bar";
        form_data = {
            ...base,
            viz_type: vizType,
            x_axis: groupby[0],
            groupby: [],
            metrics: [metric]
        };
    }

    const res = await client.post(
        `${SUPERSET_URL}/api/v1/chart/`,
        {
            slice_name: `AI ${chartType} Chart`,
            viz_type: vizType,
            datasource_id: DATASET_ID,
            datasource_type: "table",
            params: JSON.stringify(form_data)
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-CSRFToken": csrfToken
            }
        }
    );

    return res.data.id;
}

// 📊 Dashboard
async function createDashboard(token, csrfToken) {
    const res = await client.post(
        `${SUPERSET_URL}/api/v1/dashboard/`,
        {
            dashboard_title: "AI Generated Dashboard"
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-CSRFToken": csrfToken
            }
        }
    );
    return res.data.id;
}

// 🚀 Publish: create chart + dashboard + attach, return the dashboard URL
async function publishToSuperset(config = {}) {
    const token = await login();
    const csrfToken = await getCSRFToken(token);

    const chartId = await createChart(token, csrfToken, config);
    const dashboardId = await createDashboard(token, csrfToken);
    await addChartToDashboard(dashboardId, chartId, token, csrfToken);

    return {
        dashboardId,
        chartId,
        dashboardUrl: `${SUPERSET_URL}/superset/dashboard/${dashboardId}/`
    };
}

// 🔥 Attach chart
async function addChartToDashboard(dashboardId, chartId, token, csrfToken) {
    const position_json = {
        ROOT_ID: { id: "ROOT_ID", type: "ROOT", children: ["GRID_ID"] },
        GRID_ID: { id: "GRID_ID", type: "GRID", children: ["ROW_ID"] },
        ROW_ID: { id: "ROW_ID", type: "ROW", children: ["COLUMN_ID"] },
        COLUMN_ID: {
            id: "COLUMN_ID",
            type: "COLUMN",
            children: [`CHART-${chartId}`],
            meta: {
                width: 12,
                background: "transparent"
            }
        },
        [`CHART-${chartId}`]: {
            id: `CHART-${chartId}`,
            type: "CHART",
            children: [],
            meta: {
                chartId,
                sliceName: "AI Chart",
                width: 12,
                height: 50,
                background: "transparent"
            }
        }
    };

    await client.put(
        `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
        {
            position_json: JSON.stringify(position_json)
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-CSRFToken": csrfToken
            }
        }
    );
}

module.exports = {
    runSQL,
    createChart,
    createDashboard,
    addChartToDashboard,
    publishToSuperset
};