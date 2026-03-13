import { resolveInput } from "../nodeutils.js";

export default async function templateString(node) {

	const values = await Promise.all(
		node.input.sources.map(id => resolveInput(id))
	);

	let result = await resolveInput(node.input.template);

	values.forEach((value, index) => {
		result = result.replaceAll(`{${index}}`, value ?? "");
	});

	return result;
}