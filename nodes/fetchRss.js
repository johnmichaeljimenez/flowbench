import { resolveInput, resolveFilePath } from "../nodeutils.js";
import xml2js from "xml2js";

export default async function fetchRss(node, context) {
	const url = await resolveInput(node.input.url, context);
	const rawFields = await resolveInput(node.input.fields ?? null, context);

	let fieldsConfig = null;
	if (rawFields) {
		if (typeof rawFields === 'string') {
			try {
				fieldsConfig = JSON.parse(rawFields);
			} catch {
				console.warn("fields input looks like invalid JSON → ignored");
			}
		} else if (typeof rawFields === 'object' && rawFields !== null) {
			fieldsConfig = rawFields;
		}
	}

	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch ${url}`);

	const rssXml = await response.text();
	const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
	const rssData = await parser.parseStringPromise(rssXml);

	const channel = rssData?.rss?.channel;
	if (!channel) throw new Error("Invalid RSS feed");

	const items = Array.isArray(channel.item) ? channel.item : [channel.item];

	const mappedItems = items.map(item => ({
		title: item.title ?? null,
		link: item.link ?? null,
		description: item.description ?? null,
		pubDate: item.pubDate ?? null,
		guid: item.guid ?? null
	}));

	const fullResult = {
		title: channel.title ?? null,
		link: channel.link ?? null,
		description: channel.description ?? null,
		items: mappedItems
	};

	if (fieldsConfig && typeof fieldsConfig === 'object') {
		return {
			value: JSON.stringify(Object.entries(fullResult).reduce((acc, [key, value]) => {
				if (key === "items" && Array.isArray(fieldsConfig.items)) {
					acc.items = value.map(v =>
						fieldsConfig.items.reduce((subAcc, k) => {
							if (k in v) subAcc[k] = v[k];
							return subAcc;
						}, {})
					);
				} else if (fieldsConfig[key]) {
					acc[key] = value;
				}
				return acc;
			}, {}))
		};
	}

	return {
		value: JSON.stringify(fullResult)
	}
};

export const nodeMetadata = {
	type: "fetchRss",
	name: "Fetch RSS",
	description: "Fetches and parses an RSS feed into clean JSON.",
	category: "Integration",
	inputs: {
		url: { type: "string", required: true, supportsRef: true },
		fields: { type: "object", required: false, supportsRef: false, description: "Optional fields to extract" }
	},
	outputs: ["value"]
};