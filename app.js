#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { processGraph, generateMermaidViz } from "./engine.js";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '.env')
});

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node app.js <graph.json> [startNode] [--viz] [--. ]...');
    process.exit(1);
}

const graphPath = path.resolve(args[0]);
if (!existsSync(graphPath)) {
    console.error(`Graph file not found: ${graphPath}`);
    process.exit(1);
}

process.chdir(path.dirname(graphPath));
const graphData = JSON.parse(readFileSync(graphPath, "utf-8"));

let viz = false;
let startNodeId = "out1";
const params = {};

for (let i = 1; i < args.length;) {
    const arg = args[i];
    if (arg === '--viz') {
        viz = true;
        i++;
        continue;
    }
    if (!arg.startsWith('--')) {
        if (startNodeId === "out1") {
            startNodeId = arg;
        } else {
            console.error('Unexpected positional argument after startNode');
            process.exit(1);
        }
        i++;
        continue;
    }
    // --key value
    const key = arg.slice(2);
    i++;
    if (i >= args.length) {
        console.error(`Missing value for ${arg}`);
        process.exit(1);
    }
    params[key] = args[i];
    i++;
}

async function main() {
    try {
        if (viz) {
            generateMermaidViz(graphData, "./graph.png");
        } else {
            const output = await processGraph(graphData, startNodeId, true, params);
            console.log(JSON.stringify(output, null, 2));
        }
        process.exit(0);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
main();