#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { processGraph } from "./engine.js";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '.env')
});

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node app.js <graph.json> [startNode] [--<nodeId>.<inputField> <value>]...');
    process.exit(1);
}

const params = {};
let startNodeId = "out1";
let paramIndex = 1;
if (args.length > 1 && !args[1].startsWith('--')) {
    startNodeId = args[1];
    paramIndex = 2;
}
for (let i = paramIndex; i < args.length; i += 2) {
    const keyArg = args[i];
    if (keyArg.startsWith('--') && i + 1 < args.length) {
        params[keyArg.slice(2)] = args[i + 1];
    }
}

const graphPath = path.resolve(args[0]);
if (!existsSync(graphPath)) {
    console.error(`Graph file not found: ${graphPath}`);
    process.exit(1);
}

process.chdir(path.dirname(graphPath));

const graphData = JSON.parse(readFileSync(graphPath, "utf-8"));

async function main() {
    try {
        const output = await processGraph(graphData, startNodeId, true, params);
        console.log(JSON.stringify(output, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
main();