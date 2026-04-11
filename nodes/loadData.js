import { resolveInput, resolveFilePath } from "../nodeutils.js";
import { query } from "../db.js";

function escapeIdentifier(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Table/column name must be a non-empty string");
  }
  const trimmed = name.trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    throw new Error(
      "Table/column names can only contain letters, numbers and underscores, and must start with a letter or underscore."
    );
  }
  return '"' + trimmed.replace(/"/g, '""') + '"';
}

export default async function loadData(node, context) {
	const dbName = (await resolveInput(node.input.dbName, context)) || "main";
	const tableNameRaw = await resolveInput(node.input.tableName, context);
	let columnsInput = await resolveInput(node.input.columns, context) || "*";
	const filters = await resolveInput(node.input.filters, context) || {};
	let limit = Number(await resolveInput(node.input.limit, context)) || 100;

	if (!tableNameRaw) throw new Error("tableName is required for loadData");

	const tableName = escapeIdentifier(tableNameRaw);
	
	let columnList = columnsInput === "*" ? "*" : 
		(Array.isArray(columnsInput) 
			? columnsInput.map(escapeIdentifier).join(", ") 
			: String(columnsInput).split(",").map(c => escapeIdentifier(c.trim())).join(", "));

	let sql = `SELECT ${columnList} FROM ${tableName}`;
	const args = [];

	const whereClauses = [];
	for (const [key, value] of Object.entries(filters)) {
		const escapedKey = escapeIdentifier(key);
		whereClauses.push(`${escapedKey} = ?`);
		args.push(value);
	}
	if (whereClauses.length > 0) sql += ` WHERE ${whereClauses.join(" AND ")}`;

	sql += ` LIMIT ?`;
	args.push(limit);

	const rows = await query(dbName, sql, args);

	return {
		value: JSON.stringify(rows, null, 4),
		rows,
		rowCount: rows.length,
		dbName
	};
}

export const nodeMetadata = {
	type: "loadData",
	name: "Load Data (Turso)",
	description: "Safely loads rows from any named Turso database (premade parameterized SELECT).",
	category: "Database",
	inputs: {
		dbName: { type: "string", required: false, default: "main", supportsRef: true },
		tableName: { type: "string", required: true, supportsRef: true },
		columns: { type: "string", required: false, default: "*", supportsRef: true },
		filters: { type: "object", required: false, supportsRef: true },
		limit: { type: "number", required: false, default: 100, supportsRef: true }
	},
	outputs: ["value", "rows", "rowCount", "dbName"]
};