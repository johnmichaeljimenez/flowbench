import { resolveInput, resolveFilePath } from "../nodeutils.js";

export default async function select(node, context) {
    const key = await resolveInput(node.input.key, context);
    const cases = node.input.cases || {};

    const targetRef = Object.prototype.hasOwnProperty.call(cases, key)
        ? await resolveInput(cases[key], context)
        : await resolveInput(node.input.defaultSource, context);

    const chosen = await resolveInput(targetRef, context);

    return {
        value: chosen,
        matchedKey: key
    };
}

export const nodeMetadata = {
    type: "select",
    name: "Select",
    description: "Multi-branch selector: picks an input based on a matching key",
    category: "Core",
    mermaid: {
        shape: "diamond",
        className: "decision"
    },
    inputs: {
        key: {
            type: "string",
            required: true,
            supportsRef: true
        },
        cases: {
            type: "object",
            required: true,
            supportsRef: false,
            description: "Object mapping keys to sources, e.g., { 'A': '$ref1', 'B': '$ref2' }"
        },
        defaultSource: {
            type: "any",
            required: false,
            supportsRef: true,
            description: "Fallback if no cases match"
        }
    },
    outputs: ["value", "matchedKey"]
};