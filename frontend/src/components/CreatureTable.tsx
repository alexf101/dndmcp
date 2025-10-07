import styled from 'styled-components';
import type { Creature } from '../types';

const TableContainer = styled.div`
  border: 1px solid #666;
  border-radius: 8px;
  padding: 1.5rem;
  background: #1a1a1a;

  h3 {
    margin-top: 0;
    color: #d4af37;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;

  th,
  td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #444;
  }

  th {
    background: #333;
    font-weight: bold;
    color: #ccc;
  }
`;

const CreatureRow = styled.tr<{ $isCurrentTurn?: boolean }>`
  ${({ $isCurrentTurn }) =>
    $isCurrentTurn &&
    `
    background: #1a3d1a;
    border-left: 3px solid #4CAF50;
  `}
`;

const HPSpan = styled.span<{ $isDead?: boolean; $isCritical?: boolean; $isWounded?: boolean }>`
  ${({ $isDead }) => $isDead && 'color: #f44336; text-decoration: line-through;'}
  ${({ $isCritical }) => $isCritical && 'color: #ff9800; font-weight: bold;'}
  ${({ $isWounded }) => $isWounded && 'color: #ffeb3b;'}
`;

const StatusEffects = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
`;

const StatusEffect = styled.span`
  background: #444;
  color: #fff;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.8rem;
`;

const NoEffects = styled.span`
  color: #888;
`;

const CreatureId = styled.td`
  font-family: monospace;
  font-size: 0.7rem;
  color: #888;
`;

interface CreatureTableProps {
  creatures: Creature[];
  currentTurn: number;
}

export default function CreatureTable({ creatures, currentTurn }: CreatureTableProps) {
  if (creatures.length === 0) {
    return (
      <TableContainer>
        <h3>Creatures</h3>
        <p>No creatures in this battle yet.</p>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <h3>Initiative Order & Status</h3>
      <StyledTable>
        <thead>
          <tr>
            <th>Initiative</th>
            <th>Name</th>
            <th>Type</th>
            <th>HP</th>
            <th>AC</th>
            <th>Status Effects</th>
            <th>ID</th>
          </tr>
        </thead>
        <tbody>
          {creatures.map((creature, index) => (
            <CreatureRow
              key={creature.id}
              $isCurrentTurn={index === currentTurn}
            >
              <td>{creature.initiative}</td>
              <td>
                {index === currentTurn && '➤ '}
                {creature.name}
              </td>
              <td>{creature.isPlayer ? '👤 Player' : '🐉 NPC'}</td>
              <td>
                <HPSpan
                  $isDead={creature.hp <= 0}
                  $isCritical={creature.hp > 0 && creature.hp <= creature.maxHp / 4}
                  $isWounded={creature.hp > creature.maxHp / 4 && creature.hp <= creature.maxHp / 2}
                >
                  {creature.hp}/{creature.maxHp}
                </HPSpan>
              </td>
              <td>{creature.ac}</td>
              <td>
                {creature.statusEffects.length > 0 ? (
                  <StatusEffects>
                    {creature.statusEffects.map((effect, i) => (
                      <StatusEffect key={i}>
                        {effect.name}
                        {effect.duration && ` (${effect.duration})`}
                        {effect.concentration && ' 🧠'}
                      </StatusEffect>
                    ))}
                  </StatusEffects>
                ) : (
                  <NoEffects>—</NoEffects>
                )}
              </td>
              <CreatureId>{creature.id}</CreatureId>
            </CreatureRow>
          ))}
        </tbody>
      </StyledTable>
    </TableContainer>
  );
}