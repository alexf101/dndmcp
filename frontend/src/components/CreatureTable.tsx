import styled from "styled-components";
import type { Creature } from "../types";

const TableContainer = styled.div`
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.lg};
    padding: ${({ theme }) => theme.spacing.lg};
    background: ${({ theme }) => theme.colors.background.surface};

    h3 {
        margin-top: 0;
        color: ${({ theme }) => theme.colors.primary};
    }
`;

const StyledTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-top: ${({ theme }) => theme.spacing.md};

    th,
    td {
        padding: ${({ theme }) => theme.spacing.sm};
        text-align: left;
        border-bottom: 1px solid
            ${({ theme }) => theme.colors.interactive.border};
        color: ${({ theme }) => theme.colors.text.secondary};
    }

    th {
        background: ${({ theme }) => theme.colors.background.surfaceHover};
        font-weight: ${({ theme }) => theme.typography.weights.bold};
        color: ${({ theme }) => theme.colors.text.primary};
    }
`;

const CreatureRow = styled.tr<{ $isCurrentTurn?: boolean }>`
    ${({ $isCurrentTurn, theme }) =>
        $isCurrentTurn &&
        `
    background: ${theme.colors.currentTurn.background};
    border-left: 3px solid ${theme.colors.currentTurn.border};
  `}
`;

const HPSpan = styled.span<{
    $isDead?: boolean;
    $isCritical?: boolean;
    $isWounded?: boolean;
}>`
    ${({ $isDead, theme }) =>
        $isDead &&
        `color: ${theme.colors.status.danger}; text-decoration: line-through;`}
    ${({ $isCritical, theme }) =>
        $isCritical &&
        `color: ${theme.colors.status.warning}; font-weight: ${theme.typography.weights.bold};`}
  ${({ $isWounded, theme }) =>
        $isWounded && `color: ${theme.colors.status.warningBg};`}
`;

const StatusEffects = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.xs};
`;

const StatusEffect = styled.span`
    background: ${({ theme }) => theme.colors.interactive.border};
    color: ${({ theme }) => theme.colors.text.primary};
    padding: 0.1rem 0.3rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    font-size: ${({ theme }) => theme.typography.sizes.sm};
`;

const NoEffects = styled.span`
    color: ${({ theme }) => theme.colors.text.quaternary};
`;

const CreatureId = styled.td`
    font-family: ${({ theme }) => theme.typography.families.mono};
    font-size: ${({ theme }) => theme.typography.sizes.xs};
    color: ${({ theme }) => theme.colors.text.quaternary};
`;

const ActionsCell = styled.td`
    display: flex;
    gap: ${({ theme }) => theme.spacing.xs};
    align-items: center;
`;

const ActionButton = styled.button<{
    $variant?: "delete" | "edit" | "highlight" | "highlighted";
}>`
    background: none;
    border: 1px solid transparent;
    padding: ${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.radii.base};
    cursor: pointer;
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    transition: all 0.2s ease;

    ${({ $variant, theme }) => {
        switch ($variant) {
            case "delete":
                return `
          color: ${theme.colors.status.danger};
          &:hover {
            background: ${theme.colors.error.background};
            border-color: ${theme.colors.status.danger};
          }
        `;
            case "edit":
                return `
          color: ${theme.colors.text.secondary};
          &:hover {
            background: ${theme.colors.background.surfaceHover};
            border-color: ${theme.colors.interactive.border};
            color: ${theme.colors.primary};
          }
        `;
            case "highlight":
                return `
          color: ${theme.colors.text.secondary};
          &:hover {
            background: ${theme.colors.background.surfaceHover};
            border-color: ${theme.colors.interactive.border};
            color: ${theme.colors.primary};
          }
        `;
            case "highlighted":
                return `
          color: ${theme.colors.primary};
          background: ${theme.colors.background.surfaceHover};
          border-color: ${theme.colors.primary};
        `;
            default:
                return "";
        }
    }}
`;

interface CreatureTableProps {
    creatures: Creature[];
    currentTurn: number;
    onFillCommand?: (command: string) => void;
    onHighlightCreature?: (creatureId: string) => void;
    highlightedCreatureId?: string | null;
}

export default function CreatureTable({
    creatures,
    currentTurn,
    onFillCommand,
    onHighlightCreature,
    highlightedCreatureId,
}: CreatureTableProps) {
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
                        <th>Actions</th>
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
                                {index === currentTurn && "➤ "}
                                {creature.name}
                            </td>
                            <td>
                                {creature.isPlayer ? "👤 Player" : "🐉 NPC"}
                            </td>
                            <td>
                                <HPSpan
                                    $isDead={creature.hp <= 0}
                                    $isCritical={
                                        creature.hp > 0 &&
                                        creature.hp <= creature.maxHp / 4
                                    }
                                    $isWounded={
                                        creature.hp > creature.maxHp / 4 &&
                                        creature.hp <= creature.maxHp / 2
                                    }
                                >
                                    {creature.hp}/{creature.maxHp}
                                </HPSpan>
                            </td>
                            <td>{creature.ac}</td>
                            <td>
                                {creature.statusEffects?.length > 0 ? (
                                    <StatusEffects>
                                        {creature.statusEffects?.map(
                                            (effect, i) => (
                                                <StatusEffect key={i}>
                                                    {effect.name}
                                                    {effect.duration &&
                                                        ` (${effect.duration})`}
                                                    {effect.concentration &&
                                                        " 🧠"}
                                                </StatusEffect>
                                            ),
                                        )}
                                    </StatusEffects>
                                ) : (
                                    <NoEffects>—</NoEffects>
                                )}
                            </td>
                            <CreatureId>{creature.id}</CreatureId>
                            <ActionsCell>
                                <ActionButton
                                    $variant="delete"
                                    title="Delete creature"
                                    onClick={() =>
                                        onFillCommand &&
                                        onFillCommand(
                                            `{\n  "type": "REMOVE_CREATURE",\n  "data": {\n    "creatureId": "${creature.id}"\n  }\n}`,
                                        )
                                    }
                                >
                                    🗑️
                                </ActionButton>
                                <ActionButton
                                    $variant="edit"
                                    title="Edit creature"
                                    onClick={() =>
                                        onFillCommand &&
                                        onFillCommand(
                                            `{\n  "type": "UPDATE_CREATURE",\n  "data": {\n    "creatureId": "${creature.id}",\n    "updates": {\n      "hp": ${creature.hp}\n    }\n  }\n}`,
                                        )
                                    }
                                >
                                    ✏️
                                </ActionButton>
                                <ActionButton
                                    $variant={
                                        highlightedCreatureId === creature.id
                                            ? "highlighted"
                                            : "highlight"
                                    }
                                    title={
                                        highlightedCreatureId === creature.id
                                            ? "Remove highlight"
                                            : "Highlight on map"
                                    }
                                    onClick={() =>
                                        onHighlightCreature &&
                                        onHighlightCreature(
                                            highlightedCreatureId ===
                                                creature.id
                                                ? ""
                                                : creature.id,
                                        )
                                    }
                                >
                                    👁️
                                </ActionButton>
                            </ActionsCell>
                        </CreatureRow>
                    ))}
                </tbody>
            </StyledTable>
        </TableContainer>
    );
}
