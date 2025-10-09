import { useState, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import type { CommandPreset } from '../types';

const FormContainer = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.surface};
  color: ${({ theme }) => theme.colors.text.secondary};

  h3, h4 {
    margin-top: 0;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Presets = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const PresetButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const PresetButton = styled.button<{ $selected?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.interactive.border};
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary : theme.colors.background.button};
  color: ${({ $selected, theme }) =>
    $selected ? '#000' : theme.colors.text.secondary};
  border-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary : theme.colors.interactive.border};
  border-radius: ${({ theme }) => theme.radii.base};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.sizes.sm};

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected ? theme.colors.primaryHover : theme.colors.background.buttonHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CommandInput = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InputHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};

  label {
    font-weight: ${({ theme }) => theme.typography.weights.bold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  button {
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    background: ${({ theme }) => theme.colors.background.button};
    color: ${({ theme }) => theme.colors.text.secondary};
    border-radius: ${({ theme }) => theme.radii.sm};
    cursor: pointer;
  }
`;

const CommandTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #666;
  background: #000;
  color: #fff;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
  resize: vertical;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d4af37;
  background: #d4af37;
  color: #000;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 1.5rem;

  &:hover {
    background: #c4a147;
  }

  &:disabled {
    background: #666;
    border-color: #666;
    color: #999;
    cursor: not-allowed;
  }
`;

const CommandHelp = styled.div`
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    padding: ${({ theme }) => theme.spacing.xs} 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.background.surfaceHover};
    font-size: ${({ theme }) => theme.typography.sizes.base};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  code {
    background: ${({ theme }) => theme.colors.background.surfaceHover};
    color: ${({ theme }) => theme.colors.text.primary};
    padding: 0.1rem 0.3rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    font-family: ${({ theme }) => theme.typography.families.mono};
  }
`;

interface CommandFormProps {
  onExecute: (command: string) => Promise<void>;
  presets: CommandPreset[];
  disabled: boolean;
}

export interface CommandFormRef {
  fillCommand: (command: string) => void;
}

const CommandForm = forwardRef<CommandFormRef, CommandFormProps>(
  ({ onExecute, presets, disabled }, ref) => {
  const [command, setCommand] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  const handlePresetSelect = (preset: CommandPreset) => {
    setCommand(preset.command);
    setSelectedPreset(preset.name);
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    try {
      await onExecute(command);
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(command);
      setCommand(JSON.stringify(parsed, null, 2));
    } catch {
      console.error('Invalid JSON');
    }
  };

  useImperativeHandle(ref, () => ({
    fillCommand: (cmd: string) => {
      setCommand(cmd);
      setSelectedPreset(''); // Clear any selected preset when filling from external source
    }
  }));

  return (
    <FormContainer>
      <h3>Command Interface</h3>

      <Presets>
        <h4>Quick Commands</h4>
        <PresetButtons>
          {presets.map((preset, index) => (
            <PresetButton
              key={index}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              disabled={disabled}
              $selected={selectedPreset === preset.name}
              title={preset.description}
            >
              {preset.name}
            </PresetButton>
          ))}
        </PresetButtons>
      </Presets>

      <form onSubmit={handleExecute}>
        <CommandInput>
          <InputHeader>
            <label htmlFor="command-textarea">JSON Command:</label>
            <button type="button" onClick={formatJson} disabled={disabled}>
              Format JSON
            </button>
          </InputHeader>
          <CommandTextarea
            id="command-textarea"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter JSON command here..."
            rows={12}
            disabled={disabled}
          />
        </CommandInput>

        <SubmitButton type="submit" disabled={disabled || !command.trim()}>
          Execute Command
        </SubmitButton>
      </form>

      <CommandHelp>
        <h4>Available Commands</h4>
        <ul>
          <li><code>CREATE_BATTLE</code> - Create a new battle</li>
          <li><code>ADD_CREATURE</code> - Add a creature to the battle</li>
          <li><code>UPDATE_CREATURE</code> - Update creature properties</li>
          <li><code>REMOVE_CREATURE</code> - Remove a creature from battle</li>
          <li><code>NEXT_TURN</code> - Advance to next turn</li>
          <li><code>START_BATTLE</code> - Start the battle</li>
          <li><code>UNDO</code> - Undo the last action</li>
        </ul>
      </CommandHelp>
    </FormContainer>
  );
});

CommandForm.displayName = 'CommandForm';

export default CommandForm;