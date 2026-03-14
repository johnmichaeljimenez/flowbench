import express from 'express';
import dotenv from "dotenv";
import path from "node:path";
import { processGraph } from "./engine.js";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '.env')
});

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json', limit: '10mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/process', async (req, res) => {
    const { graph, startNode, params } = req.body;

    if (!graph) {
        return res.status(400).json({ error: 'Missing "graph" in request body' });
    }

    try {
        const output = await processGraph(graph, startNode, params);
        res.json({ result: output });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "127.0.0.1", () => {
    console.log(`Flowbench server running on http://localhost:${PORT}`);
});