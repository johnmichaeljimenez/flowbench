import { resolveInput } from "../nodeutils.js";

export default async function executeShell(node, options) {
	const command = await resolveInput(node.input.command);
	const fireAndForget = await resolveInput(node.input.fireAndForget) ?? false;

	const { spawn } = await import('node:child_process');

	if (fireAndForget) {
		spawn(command, {
			shell: true,
			stdio: 'ignore',
			detached: true
		});
		return '';
	}

	return new Promise((resolve) => {
		const child = spawn(command, {
			shell: true,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let output = '';
		let errorOutput = '';

		child.stdout.on('data', (data) => {
			output += data.toString();
		});

		child.stderr.on('data', (data) => {
			errorOutput += data.toString();
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve(output.trim());
			} else {
				const errorMsg = `Shell command failed (code ${code}): ${errorOutput || output}`;
				console.error(errorMsg);
				resolve(errorMsg);
			}
		});

		child.on('error', (err) => {
			console.error('Shell execution error:', err);
			resolve(`Error: ${err.message}`);
		});
	});
}