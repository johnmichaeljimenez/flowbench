import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from 'node:url';
import nodeNotifier from "node-notifier";

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

export function validateGraph(graphData) {
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

export function generateMermaidViz(graphData) {
    if (!validateGraph(graphData)) {
        return;
    }

    const nodes = graphData.graph || [];
    let mermaid = `%%{init: {"theme": "base", "themeVariables": {"lineColor": "#9ca3af"}}}%%
flowchart TD\n`;

    const nodeMap = new Map();
    const edges = new Set();
    const classAssignments = new Map();

    nodes.forEach(node => {
        const meta = nodeRegistry[node.type];
        const mermaidConfig = meta?.mermaid || { shape: "rectangle" };

        const label = `${node.id}<br>(${node.type})`;

        let nodeDef;
        switch (mermaidConfig.shape) {
            case "diamond":
                nodeDef = `${node.id}{"${label}"}`;
                break;
            case "stadium":
                nodeDef = `${node.id}([${label}])`;
                break;
            case "circle":
                nodeDef = `${node.id}(( ${label} ))`;
                break;
            case "rounded":
                nodeDef = `${node.id}(${label})`;
                break;
            case "hexagon":
                nodeDef = `${node.id}{{ ${label} }}`;
                break;
            default:
                nodeDef = `${node.id}["${label}"]`;
        }

        mermaid += `    ${nodeDef}\n`;
        nodeMap.set(node.id, label);

        function findRefs(obj) {
            if (typeof obj === 'string' && obj.startsWith('$')) {
                const refId = obj.slice(1).split('.')[0];
                if (nodeMap.has(refId)) {
                    edges.add(`${refId} --> ${node.id}`);
                }
            } else if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(findRefs);
            }
        }
        findRefs(node.input);

        if (mermaidConfig.className) {
            if (!classAssignments.has(mermaidConfig.className)) {
                classAssignments.set(mermaidConfig.className, []);
            }
            classAssignments.get(mermaidConfig.className).push(node.id);
        }
    });

    edges.forEach(edge => mermaid += `    ${edge}\n`);

    mermaid += `    classDef decision fill:#fefce8,stroke:#854d0e,stroke-width:3px;\n`;
    mermaid += `    classDef file-writer fill:#ecfdf5,stroke:#10b981,stroke-width:3px;\n`;

    classAssignments.forEach((nodeIds, className) => {
        mermaid += `    class ${nodeIds.join(',')} ${className};\n`;
    });

    console.log(mermaid);
    return mermaid;
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

function applyInputDefaults(nodes) {
    for (const node of Object.values(nodes)) {
        const meta = nodeRegistry[node.type];
        if (!meta?.inputs) continue;

        if (!node.input) {
            node.input = {};
        }

        for (const [key, spec] of Object.entries(meta.inputs)) {
            if (!(key in node.input) && 'default' in spec) {
                node.input[key] = spec.default;
                console.log(`Applied default: ${node.id}.input.${key} = ${JSON.stringify(spec.default)}`);
            }
        }
    }
}

function createContext(localMode = false, customContext = {}) {
    const now = new Date();
    let sessionId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_` +
        `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;

    const datenow = sessionId;
    sessionId = `${sessionId}_${String(now.getMilliseconds()).padStart(3, "0")}`;

    const baseDir = customContext.baseDir || path.join(process.cwd(), "sessions", sessionId);
    console.log(`New session: ${sessionId} at ${baseDir}`);

    return {
        localMode: !!localMode,
        sessionId,
        baseDir,
        datenow,

        resolveInput: null,
        extractFromPath,
        applySchema,

        ...customContext,
    };
}

export async function processGraph(graphData, startNodeId = "out1", localMode = false, params = {}, customContext = {}) {
    const meta = graphData.meta ?? { notifyOnEnd: false };

    const cache = {};
    const nodes = Object.fromEntries(
        graphData.graph.map(node => [node.id, node])
    );

    validateGraph(graphData);

    const context = createContext(localMode, customContext);

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
            return context.extractFromPath(result, propertyPath);
        }

        if (result && typeof result === "object" && "value" in result) {
            return result.value;
        }
        return result;
    }

    context.resolveInput = resolveInput;

    async function processNode(nodeId) {
        if (nodeId in cache) {
            console.log(`Cache hit at node '${nodeId}'`);
            return cache[nodeId];
        }

        const node = nodes[nodeId];
        if (!node) {
            throw new Error(`Node not found: '${nodeId}'`);
        }

        console.log(`   [Session ${context.sessionId}] Processing node '${nodeId}' (${node.type})`);

        if (node.input) {
            for (const key in node.input) {
                let value = node.input[key];
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

        const result = await handler(node, context);
        const normalized = result && typeof result === "object" && "value" in result
            ? result
            : { value: result };

        cache[nodeId] = normalized;
        console.log(`[${nodeId}] ${node.type} completed`);
        return normalized;
    }

    function applyTemplates(str) {
        if (typeof str !== "string") return str;
        return str.replaceAll(/{{:(\w+)}}/g, (_, key) => {
            if (key === 'datenow') return context.datenow;
            return `{{:${key}}}`;
        });
    }

    applyParams(nodes, params);
    applyInputDefaults(nodes);

    if (graphData.entryPoints && Array.isArray(graphData.entryPoints)) {
        const results = {};
        for (const entryPoint of graphData.entryPoints) {
            results[entryPoint] = await processNode(entryPoint);
        }
    } else {
        await processNode(startNodeId);
    }

    if (meta.notifyOnEnd)
        nodeNotifier.notify(`Flowbench session ${context.sessionId} done!`);

    return cache;
}