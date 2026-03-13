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

export async function resolveStringList(inputRef, delimiter = ';', defaultValue = []) {
	const raw = await resolveInput(inputRef ?? '');
	if (Array.isArray(raw)) {
		return raw.map(v => String(v).trim()).filter(Boolean);
	}
	if (typeof raw === 'string' && raw.trim()) {
		return raw.split(delimiter).map(s => s.trim()).filter(Boolean);
	}
	return defaultValue;
}