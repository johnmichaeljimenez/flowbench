import path from "node:path";

export async function resolveInput(value, context) {
    if (!context?.resolveInput) {
        throw new Error("resolveInput not available on context");
    }
    return context.resolveInput(value);
}

export function extractFromPath(data, path, context) {
    if (!context?.extractFromPath) {
        throw new Error("extractFromPath not available on context");
    }
    return context.extractFromPath(data, path);
}

export function applySchema(data, schema, context) {
    if (!context?.applySchema) {
        throw new Error("applySchema not available on context");
    }
    return context.applySchema(data, schema);
}

export async function resolveStringList(inputRef, delimiter = ';', defaultValue = [], context) {
    const raw = await resolveInput(inputRef ?? '', context);
    if (Array.isArray(raw)) {
        return raw.map(v => String(v).trim()).filter(Boolean);
    }
    if (typeof raw === 'string' && raw.trim()) {
        return raw.split(delimiter).map(s => s.trim()).filter(Boolean);
    }
    return defaultValue;
}

export async function resolveFilePath(inputRef, context, defaultValue = null) {
    if (!context?.baseDir) {
        throw new Error("resolveFilePath requires a valid context with baseDir");
    }

    let pathStr = await resolveInput(inputRef ?? defaultValue, context);
    if (typeof pathStr !== "string" || !pathStr.trim()) {
        return defaultValue;
    }

    if (!path.isAbsolute(pathStr)) {
        pathStr = path.resolve(context.baseDir, pathStr);
    }
    return pathStr;
}