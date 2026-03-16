import { resolveInput } from "../nodeutils.js";
import { readFileSync, existsSync } from "node:fs";

export default async function readFromTextFile(node, options) {
	const filePath = await resolveInput(node.input.path);
	if (!existsSync(filePath))
		return "";	//todo: add allow unexisting file parameter

	return readFileSync(filePath, "utf-8");
}