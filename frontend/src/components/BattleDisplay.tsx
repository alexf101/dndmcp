import styled from 'styled-components';
import type { BattleState } from '../types';

const BattleContainer = styled.div`
  border: 1px solid #666;
  border-radius: 8px;
  padding: 1.5rem;
  background: #1a1a1a;

  h2 {
    margin-top: 0;
    color: #d4af37;
  }
`;

const BattleInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const BattleStateJson = styled.div`
  margin-top: 1.5rem;

  h3 {
    margin-bottom: 0.5rem;
    color: #888;
    font-size: 0.9rem;
  }

  pre {
    background: #000;
    padding: 1rem;
    border-radius: 4px;
    overflow: auto;
    max-height: 300px;
    font-size: 0.8rem;
    text-align: left;
  }
`;

interface BattleDisplayProps {
  battle: BattleState | null;
}

export default function BattleDisplay({ battle }: BattleDisplayProps) {
  if (!battle) {
    return (
      <BattleContainer>
        <h2>No Battle Selected</h2>
        <p>Create a new battle or select an existing one to get started.</p>
      </BattleContainer>
    );
  }

  const currentCreature = battle.creatures[battle.currentTurn];

  return (
    <BattleContainer>
      <h2>{battle.name}</h2>

      <BattleInfo>
        <InfoRow>
          <strong>Status:</strong> {battle.isActive ? '⚔️ Active' : '⏸️ Inactive'}
        </InfoRow>
        <InfoRow>
          <strong>Round:</strong> {battle.round}
        </InfoRow>
        <InfoRow>
          <strong>Current Turn:</strong> {currentCreature ? `${currentCreature.name} (${currentCreature.isPlayer ? 'Player' : 'NPC'})` : 'No creatures'}
        </InfoRow>
        <InfoRow>
          <strong>Creatures:</strong> {battle.creatures.length}
        </InfoRow>
        <InfoRow>
          <strong>Actions in History:</strong> {battle.history.length}
        </InfoRow>
      </BattleInfo>

      <BattleStateJson>
        <h3>Raw Battle State</h3>
        <pre>{JSON.stringify(battle, null, 2)}</pre>
      </BattleStateJson>
    </BattleContainer>
  );
}