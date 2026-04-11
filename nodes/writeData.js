import { resolveInput, resolveFilePath } from "../nodeutils.js";
import { execute, batchExecute } from "../db.js";

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

export default async function writeData(node, context) {
	const dbName = (await resolveInput(node.input.dbName, context)) || "main";
	const tableNameRaw = await resolveInput(node.input.tableName, context);
	let dataInput = await resolveInput(node.input.data, context);

	if (!tableNameRaw || dataInput == null) {
		throw new Error("tableName and data are required for writeData");
	}

	const tableName = escapeIdentifier(tableNameRaw);

	if (typeof dataInput === "string") {
		try {
			dataInput = JSON.parse(dataInput.trim());
		} catch (e) {
			throw new Error("writeData: 'data' is a string but not valid JSON");
		}
	}

	const isArray = Array.isArray(dataInput);
	const rows = isArray ? dataInput : [dataInput];

	if (rows.length === 0) {
		return { value: [], insertedCount: 0, dbName, tableName: tableNameRaw };
	}

	const firstRow = rows[0];
	const columns = Object.keys(firstRow);
	const escapedColumns = columns.map(escapeIdentifier);
	const colNames = escapedColumns.join(", ");
	const placeholders = columns.map(() => "?").join(", ");
	const sql = `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders})`;

	let insertedCount = 0;

	if (isArray) {
		const batch = rows.map(row => ({
			sql,
			args: columns.map(col => row[col])
		}));
		const results = await batchExecute(dbName, batch);
		insertedCount = results.length;
	} else {
		const result = await execute(dbName, sql, columns.map(col => firstRow[col]));
		insertedCount = result.rowsAffected;
	}

	return {
		value: JSON.stringify(dataInput, null, 2),
		insertedCount,
		dbName,
		tableName: tableNameRaw
	};
}

export const nodeMetadata = {
	type: "writeData",
	name: "Write Data (Turso)",
	description: "Safely inserts row(s) into any named Turso database (supports LLM JSON string).",
	category: "Database",
	inputs: {
		dbName: { type: "string", required: false, default: "main", supportsRef: true },
		tableName: { type: "string", required: true, supportsRef: true },
		data: { type: "object", required: true, supportsRef: true }
	},
	outputs: ["value", "insertedCount", "dbName", "tableName"]
};