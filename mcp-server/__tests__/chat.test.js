'use strict';

// Mock @google/genai before requiring chat.js so the lazy-init never fires
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: { generateContent: jest.fn() },
  })),
}));

const { applyPipeRules, executePlan, buildChatResponse } = require('../chat');

// ── applyPipeRules ────────────────────────────────────────────────────────────

describe('applyPipeRules', () => {
  it('pipes execute_sql result into generate_chart data param', () => {
    const rows   = [{ name: 'Jessica', total: 1000 }];
    const prev   = { data: rows };
    const step   = { tool: 'generate_chart', params: { chart_type: 'bar', title: 'Test' } };
    const done   = [{ tool: 'execute_sql', result: prev }];

    const params = applyPipeRules(step, prev, done);
    // pipe rule extracts result.data (the rows array), not the whole result object
    expect(params.data).toEqual(rows);
  });

  it('pipes create_virtual_dataset id into generate_chart datasource_id', () => {
    const prev   = { id: 22, dataset_name: 'top_names' };
    const step   = { tool: 'generate_chart', params: { chart_type: 'bar', title: 'Top Names' } };
    const done   = [{ tool: 'create_virtual_dataset', result: prev }];

    const params = applyPipeRules(step, prev, done);
    expect(params.datasource_id).toBe(22);
  });

  it('wraps generate_chart id into chart_ids array for generate_dashboard', () => {
    const prev   = { id: 42 };
    const step   = { tool: 'generate_dashboard', params: { title: 'My Dashboard' } };
    const done   = [{ tool: 'generate_chart', result: prev }];

    const params = applyPipeRules(step, prev, done);
    expect(params.chart_ids).toEqual([42]);
  });

  it('pipes generate_chart id into add_chart_to_existing_dashboard chart_id', () => {
    const prev   = { id: 7 };
    const step   = { tool: 'add_chart_to_existing_dashboard', params: { dashboard_id: 3 } };
    const done   = [{ tool: 'generate_chart', result: prev }];

    const params = applyPipeRules(step, prev, done);
    expect(params.chart_id).toBe(7);
  });

  it('returns params unchanged when no pipe rule matches', () => {
    const prev   = { status: 'healthy' };
    const step   = { tool: 'list_dashboards', params: {} };
    const done   = [{ tool: 'health_check', result: prev }];

    const params = applyPipeRules(step, prev, done);
    expect(params).toEqual({});
  });

  it('returns params unchanged when completedSteps is empty', () => {
    const step = { tool: 'generate_chart', params: { chart_type: 'pie' } };
    const params = applyPipeRules(step, null, []);
    expect(params).toEqual({ chart_type: 'pie' });
  });
});

// ── executePlan ───────────────────────────────────────────────────────────────

describe('executePlan', () => {
  it('executes all steps and returns null failedStep when all succeed', async () => {
    const rows   = [{ name: 'Alice', total: 500 }];
    const callMcp = jest.fn()
      .mockResolvedValueOnce({ data: rows })          // execute_sql
      .mockResolvedValueOnce({ id: 7, url: 'http://superset/chart/7' }); // generate_chart

    const plan = [
      { tool: 'execute_sql',   params: { database_id: 1, sql: 'SELECT ...' } },
      { tool: 'generate_chart', params: { chart_type: 'bar', title: 'Test' } },
    ];

    const { completedSteps, failedStep } = await executePlan(plan, callMcp);

    expect(failedStep).toBeNull();
    expect(completedSteps).toHaveLength(2);
    expect(completedSteps[0].tool).toBe('execute_sql');
    expect(completedSteps[1].tool).toBe('generate_chart');
  });

  it('stops at first failure and captures partial results', async () => {
    const callMcp = jest.fn()
      .mockResolvedValueOnce({ data: [] })
      .mockRejectedValueOnce(new Error('dataset not found'));

    const plan = [
      { tool: 'execute_sql',    params: { database_id: 1, sql: 'SELECT ...' } },
      { tool: 'generate_chart', params: { chart_type: 'bar' } },
    ];

    const { completedSteps, failedStep } = await executePlan(plan, callMcp);

    expect(failedStep.tool).toBe('generate_chart');
    expect(failedStep.error).toContain('dataset not found');
    expect(completedSteps).toHaveLength(1);
    expect(completedSteps[0].tool).toBe('execute_sql');
  });

  it('wires pipe rules between steps automatically', async () => {
    const rows = [{ name: 'Bob', total: 100 }];
    let capturedParams;
    const callMcp = jest.fn()
      .mockResolvedValueOnce({ data: rows })
      .mockImplementationOnce((tool, params) => { capturedParams = params; return Promise.resolve({ id: 5 }); });

    const plan = [
      { tool: 'execute_sql',    params: { database_id: 1, sql: 'SELECT ...' } },
      { tool: 'generate_chart', params: { chart_type: 'bar', title: 'Test' } },
    ];

    await executePlan(plan, callMcp);

    // generate_chart should have received data from execute_sql via pipe rule
    expect(capturedParams.data).toBeDefined();
  });
});

// ── buildChatResponse ─────────────────────────────────────────────────────────

describe('buildChatResponse', () => {
  it('populates data from execute_sql result', () => {
    const rows = [{ name: 'Alice', total: 500 }];
    const done = [{ tool: 'execute_sql', result: { data: rows } }];

    const r = buildChatResponse(done, 'Query complete');

    expect(r.reply).toBe('Query complete');
    expect(r.data).toEqual({ data: rows });
    expect(r.url).toBeNull();
  });

  it('populates url from generate_dashboard result', () => {
    const done = [{ tool: 'generate_dashboard', result: { id: 5, url: 'http://superset/dashboard/5' } }];

    const r = buildChatResponse(done, 'Dashboard created');

    expect(r.url).toBe('http://superset/dashboard/5');
    expect(r.data).toBeNull();
  });

  it('returns null data and url for discovery tools', () => {
    const done = [{ tool: 'list_dashboards', result: [{ id: 1, title: 'Main' }] }];

    const r = buildChatResponse(done, 'Found 1 dashboard');

    expect(r.data).toBeNull();
    expect(r.url).toBeNull();
    expect(r.reply).toBe('Found 1 dashboard');
  });
});
