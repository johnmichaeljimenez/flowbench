import { resolveInput, resolveFilePath } from "../nodeutils.js";

export default async function choose(node, context) {
    const condition = await resolveInput(node.input.condition ?? false, context);
    const branchRef = Boolean(condition) 
        ? node.input.trueSource 
        : node.input.falseSource;

    const chosen = await resolveInput(branchRef, context);

    return {
        value: chosen,
        boolValue: condition
    };
}

export const nodeMetadata = {
    type: "choose",
    name: "Choose (Branch)",
    description: "Simple if/else: picks between two inputs based on a boolean value",
    category: "Core",
    mermaid: {
        shape: "diamond",
        className: "decision"
    },
    inputs: {
        condition: { 
            type: "boolean", 
            required: true, 
            supportsRef: true
        },
        trueSource: { 
            type: "any", 
            required: true, 
            supportsRef: true, 
            description: "$ref to the 'true' path" 
        },
        falseSource: { 
            type: "any", 
            required: true, 
            supportsRef: true, 
            description: "$ref to the 'false' path" 
        }
    },
    outputs: ["value", "boolValue"]
};