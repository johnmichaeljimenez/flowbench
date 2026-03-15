import express from 'express';
import dotenv from "dotenv";
import path from "node:path";
import { processGraph, extractFromPath } from "./engine.js";
import { fileURLToPath } from 'node:url';
import generateForm from './forms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '.env')
});

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json', limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/form', (req, res) => {
    const graph = req.body;
    const formData = graph.form ?? [];

    let form = generateForm(formData);
    res.send(form);
});

app.post('/process', async (req, res) => {
    const graph = req.body;
    const startNode = graph.startNode ?? "out1";
    const params = graph.params ?? {};
    const outputParams = graph.output ?? [];

    if (!graph.graph) {
        return res.status(400).json({ error: 'Missing "graph" property in request body' });
    }

    try {
        const output = await processGraph(graph, startNode, params);

        let filteredOutput = {};
        if (outputParams.length > 0) {
            for (const param of outputParams) {
                const path = param.id;
                const value = extractFromPath(output, path);
                if (value !== null) {
                    filteredOutput[path] = value;
                }
            }
        } else {
            filteredOutput = output;
        }

        console.log(filteredOutput);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "127.0.0.1", () => {
    console.log(`Flowbench server running on http://localhost:${PORT}`);
});