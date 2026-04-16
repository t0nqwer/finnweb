import { BadRequestException, ValidationError } from "@nestjs/common";

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException({
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: formatValidationErrors(errors),
  });
}

function formatValidationErrors(
  errors: ValidationError[],
  parentPath = "",
): Array<{ field: string; errors: string[] }> {
  const result: Array<{ field: string; errors: string[] }> = [];

  for (const error of errors) {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      result.push({
        field: currentPath,
        errors: Object.values(error.constraints),
      });
    }

    if (error.children && error.children.length > 0) {
      result.push(...formatValidationErrors(error.children, currentPath));
    }
  }

  return result;
}
