# app/api/wordle.py

from fastapi import APIRouter, HTTPException
from models.game_state import GameState
from services.solver import get_next_guess

router = APIRouter(prefix="/wordle", tags=["Wordle"])


@router.post("/next-guess")
def next_guess(state: GameState):
    if len(state.guesses) != len(state.feedbacks):
        raise HTTPException(status_code=400, detail="Guesses and feedbacks length mismatch")

    guess = get_next_guess(state.guesses, state.feedbacks)

    if guess is None:
        raise HTTPException(status_code=404, detail="No valid words remaining")

    return {"guess": guess}
