import { GameScreen } from './features/game/GameScreen';
import { HeroSelect } from './features/setup/HeroSelect';
import { MainMenu } from './features/menu/MainMenu';
import { ResultScreen } from './features/result/ResultScreen';
import { useGameStore } from './stores/gameStore';

export default function App() {
  const screen = useGameStore((s) => s.screen);

  switch (screen) {
    case 'menu':
      return <MainMenu />;
    case 'setup':
      return <HeroSelect />;
    case 'playing':
      return <GameScreen />;
    case 'result':
      return <ResultScreen />;
  }
}
