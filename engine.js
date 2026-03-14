import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from 'node:url';
import { initNodeUtils } from "./nodeutils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    }  
    return handlers;  
})();  

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

function extractFromPath(data, path) {
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

export async function processGraph(graphData, startNodeId = "out1", params = {}) {

    const cache = {};
    const nodes = Object.fromEntries(
        graphData.graph.map(node => [node.id, node])
    );

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
        const result = await handler(node);
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

    let output;
    if (graphData.entryPoints && Array.isArray(graphData.entryPoints)) {
        const results = {};
        for (const entryPoint of graphData.entryPoints) {
            results[entryPoint] = await processNode(entryPoint);
        }
        output = results;
    } else {
        output = await processNode(startNodeId);
    }

    return output;
}