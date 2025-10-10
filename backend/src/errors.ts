class ImpossibleCommandError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ImpossibleCommandError";
    }
}

export { ImpossibleCommandError };
