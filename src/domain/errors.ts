/**
 * Sentinel domain errors. Service methods return these as values via thrown
 * errors; handlers map them to HTTP status codes (404 / 409 / 400). The
 * service layer never throws framework-coupled errors.
 */

export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export class ErrNotFound extends DomainError {
  constructor(resource: string, id: string) {
    super("not_found", `${resource} ${id} not found`);
    this.name = "ErrNotFound";
  }
}

export class ErrAlreadySold extends DomainError {
  constructor(itemId: string) {
    super("already_sold", `item ${itemId} is already sold`);
    this.name = "ErrAlreadySold";
  }
}

export class ErrInvalidTransition extends DomainError {
  readonly from: string;
  readonly to: string;

  constructor(itemId: string, from: string, to: string) {
    super(
      "invalid_transition",
      `item ${itemId}: cannot transition from ${from} to ${to}`,
    );
    this.name = "ErrInvalidTransition";
    this.from = from;
    this.to = to;
  }
}

export class ErrValidation extends DomainError {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super("validation", `validation failed: ${issues.join("; ")}`);
    this.name = "ErrValidation";
    this.issues = issues;
  }
}
