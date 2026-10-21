class FakeOcrClient {
  constructor(records = {}, cap = 137) {
    this.records = structuredClone(records);
    this.cap = cap;
    this.calls = [];
    this.failure = null;
  }
  from(table) { return new FakeOcrRequest(this, table); }
  async rpc(name, args) {
    this.calls.push({ operation: "rpc", name, args });
    return { data: args.p_documents.length, error: this.failure };
  }
  execute(request) {
    this.calls.push({ table: request.table, operation: request.operation, filters: request.filters, range: request.bounds, payload: request.payload });
    if (this.failure) return { data: null, error: this.failure, count: null };
    const rows = this.records[request.table] ?? [];
    if (request.operation === "insert") rows.push({ ...request.payload, id: "new", created_at: "now", updated_at: "now" });
    const matches = rows.filter((row) => request.filters.every(([key, value]) => row[key] === value));
    if (request.operation === "update") matches.forEach((row) => Object.assign(row, request.payload));
    if (request.singleRow && matches.length !== 1) return { data: null, error: { code: "PGRST116", message: "Expected one row" }, count: matches.length };
    const [start, end] = request.bounds ?? [0, this.cap - 1];
    return { data: structuredClone(request.singleRow ? matches[0] : matches.slice(start, Math.min(end + 1, start + this.cap))), count: matches.length, error: null };
  }
}

class FakeOcrRequest {
  constructor(client, table) { this.client = client; this.table = table; this.operation = "select"; this.filters = []; this.bounds = null; this.payload = null; this.singleRow = false; }
  select() { return this; }
  eq(key, value) { this.filters.push([key, value]); return this; }
  order() { return this; }
  range(start, end) { this.bounds = [start, end]; return this; }
  single() { this.singleRow = true; return this; }
  update(payload) { this.operation = "update"; this.payload = payload; return this; }
  insert(payload) { this.operation = "insert"; this.payload = payload; return this; }
  then(resolve, reject) { return Promise.resolve(this.client.execute(this)).then(resolve, reject); }
}

module.exports = { FakeOcrClient };
