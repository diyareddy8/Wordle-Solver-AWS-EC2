import { ApiConfig } from '../config/apiConfig';
import type { SolverRequest, SolverResponse } from '../models/gameState';

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ApiConfig.baseUrl}${ApiConfig.healthEndpoint}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function fetchNextGuess(guesses: string[], feedbacks: string[]): Promise<string> {
  const request: SolverRequest = { guesses, feedbacks };
  let response: Response;
  try {
    response = await fetch(`${ApiConfig.baseUrl}${ApiConfig.nextGuessEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("Couldn't reach the solver. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : `status ${response.status}`;
    if (response.status === 404) {
      throw new Error(`${detail}. Double-check the tile colors.`);
    }
    throw new Error(`Failed to get suggestion (${detail}).`);
  }

  const data = (await response.json()) as SolverResponse;
  return data.guess;
}
