import './App.css';
import { GameProvider } from './context/GameContext';
import { GameScreen } from './components/GameScreen';

function App() {
  return (
    <GameProvider>
      <GameScreen />
    </GameProvider>
  );
}

export default App;
