import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { searchCampaignCreatures, addCreatureFromCampaign } from '../api';
import type { CampaignCreature, BattleState } from '../types';

const SearchContainer = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.surface};

  h3 {
    margin-top: 0;
    margin-bottom: ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.base};
  background: ${({ theme }) => theme.colors.background.input};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const CreatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  max-height: 300px;
  overflow-y: auto;
`;

const CreatureItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.input};
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.base};

  &:hover {
    background: ${({ theme }) => theme.colors.background.surfaceHover};
  }
`;

const CreatureInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;

  .name {
    font-weight: bold;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .stats {
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .description {
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-style: italic;
  }
`;

const AddButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.base};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.sizes.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.text.tertiary};
    cursor: not-allowed;
  }
`;

const NoResults = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => theme.spacing.lg};
  font-style: italic;
`;

interface CampaignCreatureSearchProps {
  currentBattle: BattleState | null;
  onCreatureAdded: (updatedBattle: BattleState) => void;
  disabled?: boolean;
}

export default function CampaignCreatureSearch({
  currentBattle,
  onCreatureAdded,
  disabled = false
}: CampaignCreatureSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [creatures, setCreatures] = useState<CampaignCreature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchCreatures = async () => {
      if (searchQuery.trim().length < 2) {
        setCreatures([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const results = await searchCampaignCreatures(searchQuery.trim());
        setCreatures(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setCreatures([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchCreatures, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const handleAddCreature = async (campaignCreature: CampaignCreature) => {
    if (!currentBattle) return;

    try {
      setLoading(true);
      setError(null);

      // For grid-based battles, we might want to add position selection UI later
      // For now, let the backend place them automatically
      const updatedBattle = await addCreatureFromCampaign(
        currentBattle.id,
        campaignCreature.id
      );

      onCreatureAdded(updatedBattle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add creature');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SearchContainer>
      <h3>🏛️ Add from Campaign</h3>

      <SearchInput
        type="text"
        placeholder="Search for creatures..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        disabled={disabled || !currentBattle}
      />

      {error && (
        <NoResults style={{ color: 'red' }}>
          ❌ {error}
        </NoResults>
      )}

      {loading && (
        <NoResults>⏳ Searching...</NoResults>
      )}

      {!loading && !error && searchQuery.trim().length >= 2 && creatures.length === 0 && (
        <NoResults>No creatures found for "{searchQuery}"</NoResults>
      )}

      <CreatureList>
        {creatures.map((creature) => (
          <CreatureItem key={creature.id}>
            <CreatureInfo>
              <div className="name">{creature.name}</div>
              <div className="stats">
                HP: {creature.template.maxHp} | AC: {creature.template.ac} |
                Size: {creature.template.size} | Used: {creature.usageCount}x
              </div>
              {creature.description && (
                <div className="description">{creature.description}</div>
              )}
            </CreatureInfo>
            <AddButton
              onClick={() => handleAddCreature(creature)}
              disabled={disabled || loading || !currentBattle}
            >
              Add
            </AddButton>
          </CreatureItem>
        ))}
      </CreatureList>
    </SearchContainer>
  );
}