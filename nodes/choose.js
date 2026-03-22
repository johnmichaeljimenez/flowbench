import { resolveInput } from "../nodeutils.js";

export default async function choose(node, options) {
    const condition = await resolveInput(node.input.condition ?? false);
    const trueSource = await resolveInput(node.input.trueSource);
    const falseSource = await resolveInput(node.input.falseSource);

    const chosen = Boolean(condition) ? trueSource : falseSource;

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