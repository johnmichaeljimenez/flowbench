import express from 'express';
import dotenv from "dotenv";
import path from "node:path";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { processGraph, extractFromPath, validateGraph } from "./engine.js";
import { fileURLToPath } from 'node:url';
import generateForm from './forms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '.env')
});

const GRAPHS_DIR = path.join(__dirname, 'graphs');

function listAllGraphs() {
    const graphsDir = path.join(__dirname, 'graphs');
    const result = [];

    function walk(currentDir, basePath = '') {
        let entries;
        try {
            entries = readdirSync(currentDir);
        } catch (err) {
            console.error(err);
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                const newBase = path.join(basePath, entry).replace(/\\/g, '/');
                walk(fullPath, newBase);
            }
            else if (entry === 'index.json' && basePath !== '') {
                result.push({
                    graphName: `${basePath}/index.json`,
                    displayName: basePath
                });
            }
        }
    }

    if (existsSync(graphsDir)) {
        walk(graphsDir);
    }

    result.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return result;
}

function loadGraphByName(graphName) {
    if (typeof graphName !== 'string') {
        throw new Error('graphName must be a string');
    }

    let cleanName = graphName.replace(/^\/+/, '').replace(/\\/g, '/');
    const fullPath = path.resolve(GRAPHS_DIR, cleanName);

    if (!fullPath.startsWith(GRAPHS_DIR + path.sep)) {
        throw new Error('Invalid graph path: directory traversal detected');
    }

    if (!existsSync(fullPath)) {
        throw new Error(`Graph not found: ${cleanName} (looked in ${GRAPHS_DIR})`);
    }

    const graphData = JSON.parse(readFileSync(fullPath, 'utf-8'));
    return {
        graphData,
        graphDir: path.dirname(fullPath)
    };
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json', limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/graphs/list', (req, res) => {
    try {
        const graphs = listAllGraphs();
        res.json(graphs);
    } catch (error) {
        console.error('Error listing graphs:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/graphs', async (req, res) => {
    const { graphName, startNode = "out1", params = {} } = req.body;

    if (!graphName) {
        return res.status(400).json({ error: 'Missing "graphName" property' });
    }

    let originalCwd = null;
    try {
        const { graphData, graphDir } = loadGraphByName(graphName);

        originalCwd = process.cwd();
        process.chdir(graphDir);

        const result = await processGraph(graphData, startNode, false, params);
        const output = graphData.output;
        const outputParams = output.cards ?? [];
        
        let filteredOutput = [];

        if (outputParams.length > 0) {
            filteredOutput = outputParams
                .map(param => {
                    const value = extractFromPath(result, param.id);
                    return value !== null ? { value, ...param } : null;
                })
                .filter(Boolean);
        }

        return res.json(filteredOutput);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        if (originalCwd) process.chdir(originalCwd);
    }
});

app.post('/graphs/form', (req, res) => {
    const { graphName } = req.body;
    if (!graphName) {
        return res.status(400).json({ error: 'Missing "graphName" property' });
    }

    try {
        const { graphData } = loadGraphByName(graphName);
        validateGraph(graphData);

        const formHtml = generateForm(graphData.form ?? []);
        res.json({
            formHtml,
            meta: graphData.meta ?? {}
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "127.0.0.1", () => {
    console.log(`Flowbench server running on http://localhost:${PORT}`);
});