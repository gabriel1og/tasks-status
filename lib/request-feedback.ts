type RequestError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
  status?: number;
};

/**
 * Registra os detalhes técnicos e devolve somente a mensagem segura para a UI.
 * Exemplo: getRequestErrorFeedback("load_tasks", error, "Não foi possível carregar as tarefas.")
 */
export function getRequestErrorFeedback(
  operation: string,
  error: RequestError,
  userMessage: string,
): string {
  console.error(
    JSON.stringify({
      event: "request_failed",
      operation,
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
      status: error.status ?? null,
    }),
  );

  return userMessage;
}
