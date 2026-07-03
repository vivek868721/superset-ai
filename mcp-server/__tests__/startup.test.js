'use strict';

const { fetchStartupContext, buildSystemPrompt, extractList } = require('../startup');

// ── fetchStartupContext ───────────────────────────────────────────────────────

describe('fetchStartupContext', () => {
  it('returns databases and datasets when all MCP calls succeed', async () => {
    const callMcp = jest.fn()
      .mockResolvedValueOnce({ status: 'healthy' })                              // health_check
      .mockResolvedValueOnce({ result: [{ id: 1, database_name: 'examples' }] }) // list_databases
      .mockResolvedValueOnce({ result: [{ id: 16, table_name: 'birth_names' }] }); // list_datasets

    const ctx = await fetchStartupContext(callMcp, { delayMs: 0 });

    expect(ctx.databases).toHaveLength(1);
    expect(ctx.databases[0].database_name).toBe('examples');
    expect(ctx.datasets).toHaveLength(1);
    expect(ctx.datasets[0].table_name).toBe('birth_names');
  });

  it('retries health_check once on first failure and succeeds on second attempt', async () => {
    const callMcp = jest.fn()
      .mockRejectedValueOnce(new Error('connection refused'))  // health_check attempt 1 — fail
      .mockResolvedValueOnce({ status: 'healthy' })            // health_check attempt 2 — succeed
      .mockResolvedValueOnce({ result: [] })                   // list_databases
      .mockResolvedValueOnce({ result: [] });                  // list_datasets

    await expect(fetchStartupContext(callMcp, { delayMs: 0 })).resolves.toBeDefined();
    // 2 health_check attempts + list_databases + list_datasets
    expect(callMcp).toHaveBeenCalledTimes(4);
  });

  it('throws a clear error after 3 consecutive health_check failures', async () => {
    const callMcp = jest.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      fetchStartupContext(callMcp, { retries: 3, delayMs: 0 })
    ).rejects.toThrow('Cannot reach Superset MCP server after 3 attempts');

    expect(callMcp).toHaveBeenCalledTimes(3);
  });
});

// ── buildSystemPrompt ─────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('includes database names and IDs', () => {
    const prompt = buildSystemPrompt([{ id: 1, database_name: 'examples' }], []);
    expect(prompt).toContain('examples');
    expect(prompt).toContain('id: 1');
  });

  it('includes dataset names and IDs', () => {
    const prompt = buildSystemPrompt([], [{ id: 16, table_name: 'birth_names', database: { id: 1 } }]);
    expect(prompt).toContain('birth_names');
    expect(prompt).toContain('id: 16');
  });

  it('includes MCP tool names from every category', () => {
    const prompt = buildSystemPrompt([], []);
    // discovery
    expect(prompt).toContain('list_databases');
    expect(prompt).toContain('get_dataset_info');
    // sql
    expect(prompt).toContain('execute_sql');
    expect(prompt).toContain('create_virtual_dataset');
    // charts
    expect(prompt).toContain('generate_chart');
    expect(prompt).toContain('generate_explore_link');
    // dashboards
    expect(prompt).toContain('generate_dashboard');
    expect(prompt).toContain('add_chart_to_existing_dashboard');
  });

  it('falls back to placeholder text when no databases or datasets are provided', () => {
    const prompt = buildSystemPrompt([], []);
    expect(prompt).toContain('examples');
    expect(prompt).toContain('birth_names');
  });
});

// ── extractList ───────────────────────────────────────────────────────────────

describe('extractList', () => {
  it('returns the array directly when result is already an array', () => {
    expect(extractList([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('extracts from result.result', () => {
    expect(extractList({ result: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('extracts from result.data', () => {
    expect(extractList({ data: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });

  it('returns empty array for unexpected shapes', () => {
    expect(extractList(null)).toEqual([]);
    expect(extractList({})).toEqual([]);
    expect(extractList('string')).toEqual([]);
  });
});
