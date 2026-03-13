import { resolveInput } from "../nodeutils.js";
import xml2js from "xml2js";

export default async function fetchRss(node) {
	const url = await resolveInput(node.input.url);
	const fields = node.input.fields;

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

	if (fields && typeof fields === "object") {
		return JSON.stringify(Object.entries(fullResult).reduce((acc, [key, value]) => {
			if (key === "items" && Array.isArray(fields.items)) {
				acc.items = value.map(v =>
					fields.items.reduce((subAcc, k) => {
						if (k in v) subAcc[k] = v[k];
						return subAcc;
					}, {})
				);
			} else if (fields[key]) {
				acc[key] = value;
			}
			return acc;
		}, {}));
	}

	return JSON.stringify(fullResult);
}