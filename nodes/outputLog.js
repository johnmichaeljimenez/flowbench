import { resolveInput } from "../nodeutils.js";

export default async function outputLog(node) {
	const result = await resolveInput(node.input.source);
	console.log(result);
	return result;
};