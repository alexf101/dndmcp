import styled from 'styled-components';
import type { BattleState } from '../types';

const BattleContainer = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.surface};

  h2 {
    margin-top: 0;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const BattleInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const InfoRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const BattleStateJson = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};

  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: ${({ theme }) => theme.typography.sizes.base};
  }

  pre {
    background: ${({ theme }) => theme.colors.background.input};
    color: ${({ theme }) => theme.colors.text.secondary};
    padding: ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.radii.base};
    overflow: auto;
    max-height: 300px;
    font-size: ${({ theme }) => theme.typography.sizes.sm};
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