const axios = require('axios');

const SUPERSET_URL = process.env.SUPERSET_URL || 'http://localhost:8088';
const USERNAME = process.env.SUPERSET_USERNAME || 'admin';
const PASSWORD = process.env.SUPERSET_PASSWORD || 'admin';
const DATABASE_ID = process.env.SUPERSET_DATABASE_ID || 1;

// ✅ Your dataset ID
const DATASET_ID = 17;

// 🔐 Login
async function login() {
    const res = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
        username: USERNAME,
        password: PASSWORD,
        provider: "db",
        refresh: true
    });

    return res.data.access_token;
}

// 🧠 Execute SQL
async function runSQL(sql) {
    try {
        const token = await login();

        const res = await axios.post(
            `${SUPERSET_URL}/api/v1/sqllab/execute/`,
            {
                database_id: parseInt(DATABASE_ID),
                sql: sql,
                schema: "public",
                runAsync: false,
                expand_data: true,
                queryLimit: 1000
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return {
            data: res.data.data || res.data.result,
            token
        };

    } catch (error) {
        console.error("❌ QUERY ERROR:", error.response?.data || error.message);
        throw new Error("Query failed");
    }
}

// 📊 Create Chart
async function createChart(token, config) {
    const { chartType, groupby, metric } = config;

    let params = {
        datasource: `${DATASET_ID}__table`,
        viz_type: chartType,
        row_limit: 1000
    };

    // 🥧 PIE
    if (chartType === "pie") {
        params = {
            datasource: `${DATASET_ID}__table`,
            viz_type: "pie",
            groupby: groupby,
            metric: metric,
            row_limit: 1000
        };
    }

    // 📊 BAR
    if (chartType === "bar") {
        params = {
            datasource: `${DATASET_ID}__table`,
            viz_type: "bar",
            groupby: groupby,
            metrics: [metric],
            x_axis: groupby[0],
            row_limit: 1000
        };
    }

    // 📈 LINE
    if (chartType === "line") {
        params = {
            datasource: `${DATASET_ID}__table`,
            viz_type: "line",
            groupby: groupby,
            metrics: [metric],
            x_axis: groupby[0],
            row_limit: 1000
        };
    }

    const res = await axios.post(
        `${SUPERSET_URL}/api/v1/chart/`,
        {
            slice_name: `AI ${chartType} Chart`,
            viz_type: chartType,
            datasource_id: DATASET_ID,
            datasource_type: "table",
            params: JSON.stringify(params)
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return res.data.id;
}

// 📊 Create Dashboard
async function createDashboard(token) {
    const res = await axios.post(
        `${SUPERSET_URL}/api/v1/dashboard/`,
        {
            dashboard_title: "AI Generated Dashboard"
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return res.data.id;
}

// 🔥 Attach chart properly (FINAL FIX)
async function addChartToDashboard(dashboardId, chartId, token) {
    const position_json = {
        ROOT_ID: {
            id: "ROOT_ID",
            type: "ROOT",
            children: ["GRID_ID"]
        },
        GRID_ID: {
            id: "GRID_ID",
            type: "GRID",
            children: ["ROW_ID"]
        },
        ROW_ID: {
            id: "ROW_ID",
            type: "ROW",
            children: ["COLUMN_ID"]
        },
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
                chartId: chartId,
                sliceName: "AI Chart",
                width: 12,
                height: 50
            }
        }
    };

    const json_metadata = {
        chart_configuration: {
            [chartId]: {
                id: chartId
            }
        }
    };

    await axios.put(
        `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
        {
            position_json: JSON.stringify(position_json),
            json_metadata: JSON.stringify(json_metadata)
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
}

module.exports = {
    runSQL,
    createChart,
    createDashboard,
    addChartToDashboard
};