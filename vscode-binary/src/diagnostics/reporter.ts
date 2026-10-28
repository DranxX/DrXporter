import type { DiagnosticError } from "@drxporter/shared";
import { createLogger } from "../logging/logger";

const logger = createLogger("diagnostics");

export class DiagnosticReporter {
  private errors: DiagnosticError[] = [];

  report(error: DiagnosticError): void {
    this.errors.push(error);
    const prefix = `[${error.code}] [${error.severity.toUpperCase()}]`;
    if (error.severity === "fatal" || error.severity === "error") {
      logger.error(`${prefix} ${error.message}`);
    } else if (error.severity === "warning") {
      logger.warn(`${prefix} ${error.message}`);
    } else {
      logger.info(`${prefix} ${error.message}`);
    }
  }

  reportBatch(errors: DiagnosticError[]): void {
    for (const error of errors) {
      this.report(error);
    }
  }

  hasErrors(): boolean {
    return this.errors.some((e) => e.severity === "fatal" || e.severity === "error");
  }

  getAll(): DiagnosticError[] {
    return [...this.errors];
  }

  clear(): void {
    this.errors = [];
  }
}
