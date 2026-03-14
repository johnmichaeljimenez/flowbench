import express from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json', limit: '10mb' }));


app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "127.0.0.1", () => {
	console.log(`Flowbench server running on http://localhost:${PORT}`);
});