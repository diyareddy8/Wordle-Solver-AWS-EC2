export interface SolverRequest {
  guesses: string[];
  feedbacks: string[];
}

export interface SolverResponse {
  guess: string;
}
