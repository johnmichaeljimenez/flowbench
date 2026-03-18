import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from 'node:url';
import { initNodeUtils } from "./nodeutils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeRegistry = {};

const nodeHandlers = await (async () => {
    const handlers = {};
    const nodesDir = path.join(__dirname, "nodes");
    const files = readdirSync(nodesDir);
    for (const file of files) {
        if (!file.endsWith(".js")) continue;
        const nodeType = path.basename(file, ".js");
        const modulePath = path.join(nodesDir, file);
        const module = await import(pathToFileURL(modulePath).href);
        handlers[nodeType] = module.default;

        if (module.nodeMetadata) {
            nodeRegistry[nodeType] = module.nodeMetadata;
        } else {
            console.warn(`Node ${nodeType} has no nodeMetadata. Validation skipped`);
        }
    }
    return handlers;
})();

function validateGraph(graphData) {
    if (!graphData.graph || !Array.isArray(graphData.graph)) {
        throw new Error("Graph must have a 'graph' array");
    }

    const nodeIds = new Set();
    for (const node of graphData.graph) {
        if (!node.id || !node.type) {
            throw new Error(`Node missing id or type: ${JSON.stringify(node)}`);
        }
        if (nodeIds.has(node.id)) {
            throw new Error(`Duplicate node id: ${node.id}`);
        }
        nodeIds.add(node.id);

        const meta = nodeRegistry[node.type];
        if (!meta) {
            throw new Error(`Unknown node type: ${node.type}`);
        }

        const input = node.input || {};
        for (const [key, spec] of Object.entries(meta.inputs)) {
            if (spec.required && !(key in input)) {
                throw new Error(`Missing required input "${key}" in node ${node.id} (${node.type})`);
            }
            if (key in input) {
                const value = input[key];
                if (spec.type === "number" && typeof value !== "number") {
                    throw new Error(`Input "${key}" in ${node.id} must be number`);
                }
                if (spec.type === "boolean" && typeof value !== "boolean") {
                    throw new Error(`Input "${key}" in ${node.id} must be boolean`);
                }
            }
        }
    }

    for (const node of graphData.graph) {
        for (const val of Object.values(node.input || {})) {
            if (typeof val === "string" && val.startsWith("$")) {
                const refId = val.slice(1).split(".")[0];
                if (!nodeIds.has(refId)) {
                    throw new Error(`Broken reference $ ${refId} in node ${node.id}`);
                }
            }
        }
    }

    console.log("Graph validation passed");
    return true;
}

function applySchema(data, schema) {
    let result = {};

    for (const key in schema) {
        if (schema.hasOwnProperty(key)) {
            const path = schema[key];
            result[key] = extractFromPath(data, path);
        }
    }

    return result;
}

function applyTemplates(str) {
    if (typeof str !== "string") return str;

    if (!global.datenow) {
        const now = new Date();
        global.datenow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_` +
            `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
    }

    return str.replaceAll(/{{:(\w+)}}/g, (_, key) => {
        if (key === 'datenow') {
            return global.datenow;
        }
        return `{{:${key}}}`;
    });
}

export function extractFromPath(data, path) {
    const keys = path.split(/\.|\[|\]/).filter(Boolean);
    let value = data;

    for (let key of keys) {
        value = value[key];
        if (value === undefined) {
            return null;
        }
    }

    return value;
}

function applyParams(nodes, params) {
    for (const [paramName, paramValue] of Object.entries(params || {})) {
        const parts = paramName.split('.');
        if (parts.length !== 2) continue;

        const [nodeId, inputField] = parts;
        if (!nodes[nodeId]) continue;

        let value = paramValue;
        const num = Number(value);
        if (!isNaN(num)) {
            value = num;
        } else if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        }

        if (!nodes[nodeId].input) {
            nodes[nodeId].input = {};
        }
        nodes[nodeId].input[inputField] = value;

        console.log(`Overridden ${nodeId}.input.${inputField} = ${JSON.stringify(value)}`);
    }
}

export async function processGraph(graphData, startNodeId = "out1", localMode = false, params = {}) {

    const options = {
        localMode: localMode
    };

    const cache = {};
    const nodes = Object.fromEntries(
        graphData.graph.map(node => [node.id, node])
    );

    validateGraph(graphData);

    const processStack = new Set();

    async function resolveInput(input) {
        if (typeof input !== "string" || !input.startsWith("$")) {
            return input;
        }

        const ref = input.slice(1);
        const parts = ref.split(".");
        const nodeId = parts[0];
        const propertyPath = parts.slice(1).join(".");

        let result = await processNode(nodeId);

        if (propertyPath) {
            if (result == null || typeof result !== "object") {
                return undefined;
            }
            return extractFromPath(result, propertyPath);
        }

        if (result && typeof result === "object" && "value" in result) {
            return result.value;
        }
        return result;
    }

    async function processNode(nodeId) {
        if (nodeId in cache) {
            console.log(`Cache hit at node '${nodeId}'`);
            return cache[nodeId];
        }

        if (processStack.has(nodeId)) {
            throw new Error(`Cycle detected at node '${nodeId}'`);
        }

        const node = nodes[nodeId];
        if (!node) {
            throw new Error(`Node not found: '${nodeId}'`);
        }

        console.log(`   Processing node '${nodeId}' (${node.type})`);

        if (node.input) {
            for (const key in node.input) {
                const value = node.input[key];
                if (typeof value === "string") {
                    node.input[key] = applyTemplates(value);
                } else if (value && typeof value === "object" && !Array.isArray(value)) {
                    for (const subKey in value) {
                        if (typeof value[subKey] === "string") {
                            value[subKey] = applyTemplates(value[subKey]);
                        }
                    }
                }
            }
        }

        const handler = nodeHandlers[node.type];
        if (!handler) {
            throw new Error(`Unknown node type: ${node.type}`);
        }

        processStack.add(nodeId);
        const result = await handler(node, options);
        processStack.delete(nodeId);

        console.log(`[${nodeId}] ${node.type} completed`);
        console.log('');

        cache[nodeId] = result;

        return result;
    }

    applyParams(nodes, params);

    initNodeUtils({
        resolveInput,
        extractFromPath,
        applySchema
    });

    if (graphData.entryPoints && Array.isArray(graphData.entryPoints)) {
        const results = {};
        for (const entryPoint of graphData.entryPoints) {
            results[entryPoint] = await processNode(entryPoint);
        }
        results;
    } else {
        await processNode(startNodeId);
    }

    return cache;
}