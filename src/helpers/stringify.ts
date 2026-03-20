export function stringify(input: unknown): string {
    if (typeof input === "string") {
        return input;
    }
    if (Buffer.isBuffer(input)) {
        return input.toString("utf-8");
    }
    return JSON.stringify(input);
}