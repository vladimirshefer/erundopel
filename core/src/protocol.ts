import type { LobbyController } from "./controllers/LobbyController.js";
import type { ClientErrorResponseDto } from "./dto/ClientErrorResponseDto.js";
import type { ClientMessageDto } from "./dto/ClientMessageDto.js";
import type { ClientSessionDto } from "./dto/ClientSessionDto.js";
import { LobbyError } from "./lobby.js";

export function parseClientMessage(raw: string): ClientMessageDto<any> {
  return JSON.parse(raw) as ClientMessageDto<any>;
}

export function dispatchClientMessage(
  message: ClientMessageDto<any>,
  session: ClientSessionDto | undefined,
  controller: LobbyController,
) {
  switch (message.type) {
    case "view":
      return controller.view(message.body, session);
    case "spectate":
      return controller.spectate(message.body, session);
    case "join":
      return controller.join(message.body, session);
    case "reconnect":
      return controller.reconnect(message.body, session);
    case "leave":
      return controller.leave(message.body, session);
    case "closeLobby":
      return controller.closeLobby(message.body, session);
    case "startTask":
      return controller.startTask(message.body, session);
    case "submitAnswer":
      return controller.submitAnswer(message.body, session);
    case "vote":
      return controller.vote(message.body, session);
    case "nextTask":
      return controller.nextTask(message.body, session);
  }
  throw new Error(`Unknown message type: ${message.type}`);
}

export function toClientError(error: unknown): ClientErrorResponseDto {
  if (error instanceof LobbyError) {
    return {
      type: "error",
      error: { code: error.code, message: error.message },
    } satisfies ClientErrorResponseDto;
  }
  return {
    type: "error",
    error: {
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid request.",
    },
  } satisfies ClientErrorResponseDto;
}
