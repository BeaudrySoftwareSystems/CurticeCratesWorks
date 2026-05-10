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

/**
 * Surfaced when an uploaded blob fails server-side validation — magic-byte
 * mismatch against the declared MIME, decode failure inside `sharp`, or any
 * other "the bytes aren't what they claimed to be" condition. Always paired
 * with a `del()` call against the source blob so we never leak storage on a
 * rejected upload.
 */
export class ErrInvalidUpload extends DomainError {
  readonly blobPathname: string;
  readonly reason: string;

  constructor(blobPathname: string, reason: string) {
    super("invalid_upload", `invalid upload at ${blobPathname}: ${reason}`);
    this.name = "ErrInvalidUpload";
    this.blobPathname = blobPathname;
    this.reason = reason;
  }
}

/**
 * Surfaced when a request reaches the upload-token endpoint without a valid
 * staff session. The route handler maps this to a 401; the service layer
 * never throws framework-coupled errors.
 */
export class ErrUnauthenticated extends DomainError {
  constructor() {
    super("unauthenticated", "request is missing a valid session");
    this.name = "ErrUnauthenticated";
  }
}
