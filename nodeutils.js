let resolveInputFn = null;
let extractFromPathFn = null;
let applySchemaFn = null;

export function initNodeUtils(utils) {
	resolveInputFn = utils.resolveInput;
	extractFromPathFn = utils.extractFromPath;
	applySchemaFn = utils.applySchema;
}

export async function resolveInput(value) {
	if (!resolveInputFn) {
		throw new Error("nodeutils not initialized");
	}
	return resolveInputFn(value);
}

export function extractFromPath(data, path) {
	if (!extractFromPathFn) {
		throw new Error("nodeutils not initialized");
	}
	return extractFromPathFn(data, path);
}

export function applySchema(data, schema) {
	if (!applySchemaFn) {
		throw new Error("nodeutils not initialized");
	}
	return applySchemaFn(data, schema);
}