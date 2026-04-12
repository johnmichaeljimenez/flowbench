import { resolveInput } from "../nodeutils.js";
import { Client } from "@notionhq/client";

function cleanPropertyValue(prop) {
	if (!prop || typeof prop !== "object" || !prop.type) return null;

	switch (prop.type) {
		case "title":
		case "rich_text":
			return prop[prop.type].map(t => t.plain_text).join("") || null;
		case "status":
		case "select":
			return prop[prop.type]?.name ?? null;
		case "multi_select":
			return prop.multi_select.map(item => item.name).join(", ") || null;
		case "date":
			return prop.date?.start ?? null;
		case "people":
			return prop.people.map(p => p.name || p.email).join(", ") || null;
		case "number":
			return prop.number;
		case "checkbox":
			return prop.checkbox;
		case "url":
		case "email":
		case "phone_number":
			return prop[prop.type];
		default:
			return prop[prop.type] !== undefined ? JSON.stringify(prop[prop.type]) : null;
	}
}

function toCSV(rows, delimiter = ",") {
	if (rows.length === 0) return "";
	const headers = Object.keys(rows[0]);
	const csvRows = rows.map(row =>
		headers.map(field => {
			const val = row[field] ?? "";
			const needsQuotes = String(val).includes(delimiter) || String(val).includes('"') || String(val).includes("\n");
			return needsQuotes ? `"${String(val).replace(/"/g, '""')}"` : String(val);
		}).join(delimiter)
	);
	return [headers.join(delimiter), ...csvRows].join("\n");
}

export default async function loadNotionData(node, context) {
	const apiKeyEnvName = await resolveInput(node.input.apiKey, context);
	const databaseId = await resolveInput(node.input.databaseId, context);
	const mappingRaw = await resolveInput(node.input.mapping ?? null, context);
	const format = (await resolveInput(node.input.format ?? "json", context)).toLowerCase();
	const filterRaw = await resolveInput(node.input.query ?? null, context);

	const apiKey = process.env[apiKeyEnvName];
	if (!apiKey) throw new Error("Valid Notion API key not found in environment variable.");
	if (!databaseId) throw new Error("Database ID is required.");

	const notion = new Client({ auth: apiKey });

	try {
		const dbResponse = await notion.databases.retrieve({ database_id: databaseId });
		const dataSource = dbResponse.data_sources?.[0];
		if (!dataSource?.id) throw new Error("No data source found. Make sure your integration has access.");

		const queryOptions = {
			data_source_id: dataSource.id,
		};

		if (filterRaw && typeof filterRaw === "object" && Object.keys(filterRaw).length > 0) {
			queryOptions.filter = filterRaw;
		}

		const queryResponse = await notion.dataSources.query(queryOptions);
		const pages = queryResponse.results;

		let columnMapping = mappingRaw;
		if (!columnMapping || typeof columnMapping !== "object") {
			columnMapping = {};
			if (pages.length > 0) {
				Object.keys(pages[0].properties).forEach(propName => {
					columnMapping[propName] = propName;
				});
			}
		}

		const cleanRows = pages.map(page => {
			const row = {};
			Object.entries(columnMapping).forEach(([outputKey, notionPropName]) => {
				const prop = page.properties[notionPropName];
				row[outputKey] = cleanPropertyValue(prop);
			});
			return row;
		});

		let value;
		if (format === "csv") {
			value = toCSV(cleanRows, ",");
		} else if (format === "tsv") {
			value = toCSV(cleanRows, "\t");
		} else {
			value = JSON.stringify(cleanRows, null, 2);
		}

		return { value };
	} catch (error) {
		throw new Error(`Notion API error: ${error.message}`);
	}
}

export const nodeMetadata = {
	type: "loadNotionData",
	name: "Load Notion Data",
	description: "Fetches Notion database rows, flattens properties into clean columns (SQL-style), and supports JSON/CSV/TSV output.",
	category: "Integration",
	inputs: {
		apiKey: {
			type: "string",
			required: true,
			supportsRef: true,
			description: "Name of your environment variable containing your Notion Integration Token"
		},
		databaseId: {
			type: "string",
			required: true,
			supportsRef: true,
			description: "Notion Database ID (from the URL)"
		},
		mapping: {
			type: "object",
			required: false,
			supportsRef: false,
			description: "Optional: { \"Column Name\": \"Exact Notion Property Name\", ... } — leave empty for auto-flatten"
		},
		format: {
			type: "string",
			required: false,
			supportsRef: true,
			description: "Output format: json (default), csv, or tsv"
		}
	},
	outputs: ["value"]
};