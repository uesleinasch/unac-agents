import crypto from 'crypto';
import logger from '../../utils/logger.js';
import { getCmdWindowInput } from '../input/index.js';

// ─── Session state ────────────────────────────────────────────────────────────

interface SessionInfo {
  id: string;
  title: string;
  timeoutSeconds: number;
  isActive: boolean;
}

const activeSessions: Record<string, SessionInfo> = {};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start an intensive chat session.
 * Returns a sessionId to use with askQuestionInSession / stopIntensiveChatSession.
 */
export async function startIntensiveChatSession(
  title: string,
  timeoutSeconds = 60,
): Promise<string> {
  const sessionId = crypto.randomBytes(8).toString('hex');

  activeSessions[sessionId] = {
    id: sessionId,
    title,
    timeoutSeconds,
    isActive: true,
  };

  logger.info({ sessionId, title }, 'Intensive chat session started');
  return sessionId;
}

/**
 * Ask a question within an active intensive chat session.
 * Opens a native dialog and awaits the user's response.
 */
export async function askQuestionInSession(
  sessionId: string,
  question: string,
  predefinedOptions?: string[],
): Promise<string | null> {
  const session = activeSessions[sessionId];

  if (!session || !session.isActive) {
    logger.warn({ sessionId }, 'askQuestionInSession: session not found or inactive');
    return null;
  }

  logger.info({ sessionId, question }, 'Asking question in session');

  const answer = await getCmdWindowInput(
    session.title,
    question,
    session.timeoutSeconds,
    true,
    predefinedOptions,
  );

  return answer;
}

/**
 * Stop an active intensive chat session.
 */
export async function stopIntensiveChatSession(
  sessionId: string,
): Promise<boolean> {
  const session = activeSessions[sessionId];

  if (!session) return false;

  session.isActive = false;
  delete activeSessions[sessionId];

  logger.info({ sessionId }, 'Intensive chat session stopped');
  return true;
}

/**
 * Check if a session is still active.
 */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  return !!activeSessions[sessionId]?.isActive;
}
