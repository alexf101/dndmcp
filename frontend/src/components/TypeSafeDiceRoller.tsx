import { useState } from 'react';
import { postApiDiceRoll } from '../api/dice/dice';
import type { PostApiDiceRoll200 } from '../api/generated.schemas';

export function DiceRoller() {
  const [notation, setNotation] = useState('2d6+3');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<PostApiDiceRoll200 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await postApiDiceRoll({
        notation,
        modifier: 0,
        description: description || undefined,
      });

      if (response.status === 200) {
        setResult(response.data);
      } else if (response.status === 400) {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h2>🎲 Dice Roller (Type-Safe API)</h2>
      
      <form onSubmit={handleRoll}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Dice Notation:
            <input
              type="text"
              value={notation}
              onChange={(e) => setNotation(e.target.value)}
              placeholder="2d6+3"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Description (optional):
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Attack roll"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>

        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Rolling...' : 'Roll Dice'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          ❌ Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '4px' }}>
          <h3>Result</h3>
          <p><strong>Total:</strong> {result.total}</p>
          <p><strong>Rolls:</strong> {result.rolls.join(', ')}</p>
          <p><strong>Modifier:</strong> {result.modifier}</p>
          {result.description && <p><strong>Description:</strong> {result.description}</p>}
          <p style={{ fontSize: '12px', color: '#666' }}>
            ID: {result.id}
          </p>
        </div>
      )}
    </div>
  );
}
