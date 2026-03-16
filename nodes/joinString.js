import { resolveInput } from "../nodeutils.js";

export default async function joinString(node, options) {

	const values = await Promise.all(
		node.input.sources.map(id => resolveInput(id))
	);

	return values.join(node.input.separator ?? "");
}