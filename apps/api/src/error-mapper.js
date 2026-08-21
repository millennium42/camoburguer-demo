export function mapPostgresError(error, logger) {
  let statusCode = error.statusCode || 500;
  let message = error.message;
  let isPublic = false;
  let codeStr;

  // Domain/Client errors that were manually thrown or validated
  if (error.validation) {
    statusCode = 400;
    isPublic = true;
  } else if (
    !error.code &&
    /inválid|obrigatóri|booleano|deve ter|transição|item|preço|valor/i.test(error.message)
  ) {
    statusCode = 400;
    isPublic = true;
  } else if (error.code) {
    // PG errors mapping
    if (["22007", "22008", "22P02"].includes(error.code)) {
      statusCode = 400;
      message = "Dados ou tipos inválidos fornecidos";
      isPublic = true;
      codeStr = "INVALID_TYPE";
    } else if (error.code === "23505") {
      statusCode = 409;
      message = "Conflito de estado ou registro já existente";
      isPublic = true;
      codeStr = "UNIQUE_VIOLATION";
    } else if (error.code === "23503") {
      statusCode = 422;
      message = "Referência inválida ou registro não encontrado";
      isPublic = true;
      codeStr = "FOREIGN_KEY_VIOLATION";
    } else if (error.code === "23514") {
      statusCode = 422;
      message = "Regra de negócio violada";
      isPublic = true;
      codeStr = "CHECK_VIOLATION";
    }
  }

  // Pre-existing non-500 custom HTTP errors
  if (statusCode < 500 && !isPublic) {
    isPublic = true;
  }

  if (!isPublic) {
    logger.error(error);
    message = "Erro interno do servidor";
  } else if (
    error.code &&
    ["22007", "22008", "22P02", "23505", "23503", "23514"].includes(error.code)
  ) {
    // Log the underlying PG error carefully
    logger.warn({
      msg: "PG Client Error",
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      originalMessage: error.message,
    });
  }

  const payload = { message };
  if (codeStr) payload.code = codeStr;

  return { statusCode, payload };
}
