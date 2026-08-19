export class ApiInputError extends Error {
  constructor(message: string, public readonly code = "INVALID_REQUEST", public readonly details?: unknown) {
    super(message);
    this.name = "ApiInputError";
  }
}
