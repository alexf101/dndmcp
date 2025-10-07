import { useState } from 'react';
import styled from 'styled-components';
import type { CommandPreset } from '../types';

const FormContainer = styled.div`
  border: 1px solid #666;
  border-radius: 8px;
  padding: 1.5rem;
  background: #1a1a1a;

  h3, h4 {
    margin-top: 0;
    color: #d4af37;
  }
`;

const Presets = styled.div`
  margin-bottom: 1.5rem;
`;

const PresetButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const PresetButton = styled.button<{ $selected?: boolean }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid #666;
  background: ${({ $selected }) => ($selected ? '#d4af37' : '#333')};
  color: ${({ $selected }) => ($selected ? '#000' : 'white')};
  border-color: ${({ $selected }) => ($selected ? '#d4af37' : '#666')};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    background: ${({ $selected }) => ($selected ? '#c4a147' : '#555')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CommandInput = styled.div`
  margin-bottom: 1rem;
`;

const InputHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  label {
    font-weight: bold;
  }

  button {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    border: 1px solid #666;
    background: #333;
    color: white;
    border-radius: 3px;
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
    padding: 0.25rem 0;
    border-bottom: 1px solid #333;
    font-size: 0.9rem;
  }

  code {
    background: #333;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-family: monospace;
  }
`;

interface CommandFormProps {
  onExecute: (command: string) => Promise<void>;
  presets: CommandPreset[];
  disabled: boolean;
}

export default function CommandForm({ onExecute, presets, disabled }: CommandFormProps) {
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
}