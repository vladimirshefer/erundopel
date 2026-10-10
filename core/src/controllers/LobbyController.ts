import type { ClientDispatchResultDto } from "../dto/ClientDispatchResultDto.js";
import type {
  CloseLobbyClientMessageDto,
  JoinClientMessageDto,
  LeaveClientMessageDto,
  NextTaskClientMessageDto,
  ReconnectClientMessageDto,
  SpectateClientMessageDto,
  StartTaskClientMessageDto,
  SubmitAnswerClientMessageDto,
  ViewClientMessageDto,
  VoteClientMessageDto,
} from "../dto/ClientMessageDto.js";
import type { ClientResponseDto } from "../dto/ClientResponseDto.js";
import type { ClientSessionDto } from "../dto/ClientSessionDto.js";
import type { LobbyCommandDto } from "../dto/LobbyCommandDto.js";
import type { LobbyCommandResultDto } from "../dto/LobbyCommandResultDto.js";
import { LobbyError } from "../lobby.js";

export type ExecuteLobbyCommand = (
  code: string,
  command: LobbyCommandDto,
) => LobbyCommandResultDto;

export interface LobbyController {
  view(
    body: ViewClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;

  spectate(
    body: SpectateClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  join(
    body: JoinClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  reconnect(
    body: ReconnectClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  leave(
    body: LeaveClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  closeLobby(
    body: CloseLobbyClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  startTask(
    body: StartTaskClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  submitAnswer(
    body: SubmitAnswerClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  vote(
    body: VoteClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
  nextTask(
    body: NextTaskClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto;
}

export class LobbyControllerImpl implements LobbyController {
  constructor(private execute: ExecuteLobbyCommand) {}

  view(
    body: ViewClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.code !== "string")
      throw new Error("code must be a string.");
    if (session)
      throw new Error("Leave the current lobby before joining another one.");
    const result = this.execute(body.code, {
      type: "view",
    } satisfies LobbyCommandDto);
    return {
      state: result.state,
      response: { type: "viewed" } satisfies ClientResponseDto,
      viewCode: result.state.code,
    } satisfies ClientDispatchResultDto;
  }

  spectate(
    body: SpectateClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.code !== "string")
      throw new Error("code must be a string.");
    if (typeof body?.playerName !== "string")
      throw new Error("playerName must be a string.");
    if (session)
      throw new Error("Leave the current lobby before joining another one.");
    const result = this.execute(body.code, {
      type: "spectate",
      playerName: body.playerName,
    } satisfies LobbyCommandDto);
    if (!result.credentials)
      throw new Error("Spectate did not return player credentials.");
    return {
      state: result.state,
      response: {
        type: "spectating",
        credentials: result.credentials,
      } satisfies ClientResponseDto,
      nextSession: {
        code: result.state.code,
        playerId: result.credentials.playerId,
      },
    } satisfies ClientDispatchResultDto;
  }

  join(
    body: JoinClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.playerName !== "string")
      throw new Error("playerName must be a string.");
    if (!session)
      throw new LobbyError("PLAYER_NOT_FOUND", "Join a lobby first.");
    const result = this.execute(session.code, {
      type: "join",
      playerId: session.playerId,
      playerName: body.playerName,
    } satisfies LobbyCommandDto);
    if (!result.credentials)
      throw new Error("Join did not return player credentials.");
    return {
      state: result.state,
      response: {
        type: "joined",
        credentials: result.credentials,
      } satisfies ClientResponseDto,
      nextSession: {
        code: result.state.code,
        playerId: result.credentials.playerId,
      },
    } satisfies ClientDispatchResultDto;
  }

  reconnect(
    body: ReconnectClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.code !== "string")
      throw new Error("code must be a string.");
    if (typeof body?.playerId !== "string")
      throw new Error("playerId must be a string.");
    if (session)
      throw new Error("Leave the current lobby before joining another one.");
    const result = this.execute(body.code, {
      type: "reconnect",
      playerId: body.playerId,
    } satisfies LobbyCommandDto);
    return {
      state: result.state,
      response: { type: "resumed" } satisfies ClientResponseDto,
      nextSession: { code: result.state.code, playerId: body.playerId },
    } satisfies ClientDispatchResultDto;
  }

  leave(
    _body: LeaveClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (!session)
      throw new LobbyError("PLAYER_NOT_FOUND", "Join a lobby first.");
    const result = this.execute(session.code, {
      type: "leave",
      playerId: session.playerId,
    } satisfies LobbyCommandDto);
    return {
      state: result.state,
      response: { type: "left" } satisfies ClientResponseDto,
      detach: true,
    } satisfies ClientDispatchResultDto;
  }

  closeLobby(
    _body: CloseLobbyClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (!session)
      throw new LobbyError("PLAYER_NOT_FOUND", "Join a lobby first.");
    return this.execute(session.code, {
      type: "close",
      playerId: session.playerId,
    } satisfies LobbyCommandDto);
  }

  startTask(
    body: StartTaskClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.task?.text !== "string")
      throw new Error("task.text must be a string.");
    if (typeof body?.task?.correctAnswer?.text !== "string")
      throw new Error("task.correctAnswer.text must be a string.");
    if (
      !Array.isArray(body?.task?.wrongAnswers) ||
      !body.task.wrongAnswers.every(
        (answer) =>
          Boolean(answer) &&
          typeof answer === "object" &&
          typeof answer.text === "string",
      )
    )
      throw new Error("task.wrongAnswers must be an array of text answers.");
    if (!session)
      throw new LobbyError("PLAYER_NOT_FOUND", "Join a lobby first.");
    return this.execute(session.code, {
      type: "startTask",
      playerId: session.playerId,
      task: body.task,
    } satisfies LobbyCommandDto);
  }

  submitAnswer(
    body: SubmitAnswerClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.answer?.text !== "string")
      throw new Error("answer.text must be a string.");
    if (!session)
      throw new LobbyError("PLAYER_NOT_FOUND", "Join a lobby first.");
    return this.execute(session.code, {
      type: "submitAnswer",
      playerId: session.playerId,
      answer: body.answer,
    } satisfies LobbyCommandDto);
  }

  vote(
    body: VoteClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.answerId !== "string")
      throw new Error("answerId must be a string.");
    if (!session)
      throw new LobbyError("PLAYER_NOT_FOUND", "Join a lobby first.");
    return this.execute(session.code, {
      type: "vote",
      playerId: session.playerId,
      answerId: body.answerId,
    } satisfies LobbyCommandDto);
  }

  nextTask(
    body: NextTaskClientMessageDto,
    session: ClientSessionDto | undefined,
  ): ClientDispatchResultDto {
    if (typeof body?.task?.text !== "string")
      throw new Error("task.text must be a string.");
    if (typeof body?.task?.correctAnswer?.text !== "string")
      throw new Error("task.correctAnswer.text must be a string.");
    if (
      !Array.isArray(body?.task?.wrongAnswers) ||
      !body.task.wrongAnswers.every(
        (answer) =>
          Boolean(answer) &&
          typeof answer === "object" &&
          typeof answer.text === "string",
      )
    )
      throw new Error("task.wrongAnswers must be an array of text answers.");
    if (!session)
      throw new LobbyError("PLAYER_NOT_FOUND", "Join a lobby first.");
    return this.execute(session.code, {
      type: "nextTask",
      playerId: session.playerId,
      task: body.task,
    } satisfies LobbyCommandDto);
  }
}
