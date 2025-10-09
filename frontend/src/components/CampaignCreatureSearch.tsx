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

const SearchRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SearchInput = styled.input`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.base};
  background: ${({ theme }) => theme.colors.background.input};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ShowAllButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.input};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.base};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.background.surfaceHover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
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
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const searchCreatures = async () => {
      // If we're not showing all and the query is too short, clear results
      if (!showAll && searchQuery.trim().length < 2) {
        setCreatures([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // For "show all", we use an empty string which should match everything
        const queryToUse = showAll ? '' : searchQuery.trim();
        const results = await searchCampaignCreatures(queryToUse);
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
  }, [searchQuery, showAll]);

  const handleShowAll = () => {
    setShowAll(true);
    setSearchQuery(''); // Clear search when showing all
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (showAll && e.target.value.trim().length > 0) {
      setShowAll(false); // Exit "show all" mode when user starts typing
    }
  };

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

      <SearchRow>
        <SearchInput
          type="text"
          placeholder={showAll ? "Showing all creatures..." : "Search for creatures..."}
          value={searchQuery}
          onChange={handleSearchChange}
          disabled={disabled || !currentBattle}
        />
        <ShowAllButton
          onClick={handleShowAll}
          disabled={disabled || !currentBattle || showAll}
        >
          Show All
        </ShowAllButton>
      </SearchRow>

      {error && (
        <NoResults style={{ color: 'red' }}>
          ❌ {error}
        </NoResults>
      )}

      {loading && (
        <NoResults>⏳ Searching...</NoResults>
      )}

      {!loading && !error && (showAll || searchQuery.trim().length >= 2) && creatures.length === 0 && (
        <NoResults>
          {showAll
            ? "No creatures available in campaigns"
            : `No creatures found for "${searchQuery}"`
          }
        </NoResults>
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