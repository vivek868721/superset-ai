// require('dotenv').config();
//
//
// const axios = require('axios');
// const { wrapper } = require('axios-cookiejar-support');
// const { CookieJar } = require('tough-cookie');
//
// require('dotenv').config();
//
// const jar = new CookieJar();
// const client = wrapper(axios.create({ jar }));
//
// const SUPERSET_URL = process.env.SUPERSET_URL;
// const USERNAME = process.env.SUPERSET_USERNAME;
// const PASSWORD = process.env.SUPERSET_PASSWORD;
// const DATABASE_ID = process.env.SUPERSET_DATABASE_ID;
// const DATASET_ID = parseInt(process.env.DATASET_ID);
//
// console.log("📦 DATASET_ID:", DATASET_ID);
//
// // 🔐 Login
// async function login() {
//     const res = await client.post(`${SUPERSET_URL}/api/v1/security/login`, {
//         username: USERNAME,
//         password: PASSWORD,
//         provider: "db",
//         refresh: true
//     });
//
//     return res.data.access_token;
// }
//
// // 🛡️ CSRF
// async function getCSRFToken(token) {
//     const res = await client.get(
//         `${SUPERSET_URL}/api/v1/security/csrf_token/`,
//         {
//             headers: {
//                 Authorization: `Bearer ${token}`
//             }
//         }
//     );
//
//     return res.data.result;
// }
//
// // 🧠 Run SQL
// async function runSQL(sql) {
//     try {
//         const token = await login();
//         const csrfToken = await getCSRFToken(token);
//
//         const res = await client.post(
//             `${SUPERSET_URL}/api/v1/sqllab/execute/`,
//             {
//                 database_id: parseInt(DATABASE_ID),
//                 sql,
//                 schema: "public",
//                 runAsync: false,
//                 expand_data: true,
//                 queryLimit: 1000
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "X-CSRFToken": csrfToken,
//                     "Content-Type": "application/json"
//                 }
//             }
//         );
//
//         return { data: res.data, token, csrfToken };
//
//     } catch (error) {
//         console.error("❌ SQL ERROR:", error.response?.data || error.message);
//         throw new Error("SQL failed");
//     }
// }
//
// // 📊 Create Chart
// async function createChart(token, csrfToken, config = {}) {
//     const chartType = config.chartType || "bar";
//     const groupby = config.groupby || ["name"];
//
//     const form_data = {
//         datasource: `${DATASET_ID}__table`,
//         viz_type: chartType,
//         groupby: groupby,
//
//         metrics: [
//             {
//                 expressionType: "SQL",
//                 sqlExpression: "SUM(num)",
//                 label: "total"
//             }
//         ],
//
//         adhoc_filters: [],
//         row_limit: 1000,
//         x_axis: groupby[0]
//     };
//
//     console.log("📤 Sending params:", JSON.stringify(form_data, null, 2));
//
//     try {
//         const res = await client.post(
//             `${SUPERSET_URL}/api/v1/chart/`,
//             {
//                 slice_name: `AI ${chartType} Chart`,
//                 viz_type: chartType,
//                 datasource_id: parseInt(DATASET_ID),
//                 datasource_type: "table",
//
//                 // 🔥 THIS IS THE FIX
//                 params: JSON.stringify(form_data)
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "X-CSRFToken": csrfToken,
//                     "Content-Type": "application/json"
//                 }
//             }
//         );
//
//         console.log("✅ Chart Created:", res.data);
//         return res.data.id;
//
//     } catch (error) {
//         console.error("❌ FULL ERROR:");
//         console.error(JSON.stringify(error.response?.data, null, 2));
//         throw new Error("Chart failed");
//     }
// }
//
// // 📊 Create Dashboard
// async function createDashboard(token, csrfToken) {
//     const res = await client.post(
//         `${SUPERSET_URL}/api/v1/dashboard/`,
//         {
//             dashboard_title: "AI Generated Dashboard"
//         },
//         {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//                 "X-CSRFToken": csrfToken
//             }
//         }
//     );
//
//     return res.data.id;
// }
//
// // 🔥 Attach Chart
// async function addChartToDashboard(dashboardId, chartId, token, csrfToken) {
//
//     const position_json = {
//         ROOT_ID: {
//             id: "ROOT_ID",
//             type: "ROOT",
//             children: ["GRID_ID"]
//         },
//         GRID_ID: {
//             id: "GRID_ID",
//             type: "GRID",
//             children: ["ROW_ID"]
//         },
//         ROW_ID: {
//             id: "ROW_ID",
//             type: "ROW",
//             children: ["COLUMN_ID"]
//         },
//         COLUMN_ID: {
//             id: "COLUMN_ID",
//             type: "COLUMN",
//             children: [`CHART-${chartId}`],
//             meta: {
//                 width: 12
//             }
//         },
//         [`CHART-${chartId}`]: {
//             id: `CHART-${chartId}`,
//             type: "CHART",
//             children: [],
//             meta: {
//                 chartId: chartId,
//                 sliceName: "AI Chart",
//                 width: 12,
//                 height: 50
//             }
//         }
//     };
//
//     const json_metadata = {
//         chart_configuration: {
//             [chartId]: {
//                 id: chartId,
//                 crossFilters: {
//                     scope: "global",
//                     chartsInScope: []
//                 }
//             }
//         }
//     };
//
//     await client.put(
//         `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
//         {
//             position_json: JSON.stringify(position_json),
//             json_metadata: JSON.stringify(json_metadata)
//         },
//         {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//                 "X-CSRFToken": csrfToken
//             }
//         }
//     );
// }
//
// module.exports = {
//     runSQL,
//     createChart,
//     createDashboard,
//     addChartToDashboard
// };

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
const DATASET_ID = parseInt(process.env.DATASET_ID);

console.log("📦 DATASET_ID:", DATASET_ID);

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

// 🧠 Run SQL
async function runSQL(sql) {
    const token = await login();
    const csrfToken = await getCSRFToken(token);

    const res = await client.post(
        `${SUPERSET_URL}/api/v1/sqllab/execute/`,
        {
            database_id: parseInt(DATABASE_ID),
            sql,
            schema: "public",
            runAsync: false,
            expand_data: true,
            queryLimit: 1000
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
    const groupby = config.groupby || ["name"];

    const form_data = {
        datasource: `${DATASET_ID}__table`,
        viz_type: chartType,

        slice_id: null,

        groupby: groupby,

        metrics: [
            {
                expressionType: "SQL",
                sqlExpression: "SUM(num)",
                label: "total"
            }
        ],

        adhoc_filters: [],

        row_limit: 1000,

        x_axis: groupby[0],

        // 🔥 REQUIRED UI FIELDS (fixes crash)
        color_scheme: "supersetColors",
        show_legend: true,
        show_bar_value: true,
        rich_tooltip: true,

        // layout safety
        margin: { top: 20, right: 20, bottom: 50, left: 70 },

        // 🔥 THIS FIXES "background" crash
        viz_type: chartType
    };

    const res = await client.post(
        `${SUPERSET_URL}/api/v1/chart/`,
        {
            slice_name: `AI ${chartType} Chart`,
            viz_type: chartType,
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

    console.log("✅ Chart Created:", res.data);

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
                chartId: chartId,
                sliceName: "AI Chart",
                width: 12,
                height: 50,
                background: "transparent"   // 🔥 REQUIRED
            }
        },
        [`CHART-${chartId}`]: {
            id: `CHART-${chartId}`,
            type: "CHART",
            meta: { chartId }
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
    addChartToDashboard
};