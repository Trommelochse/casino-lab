/**
 * Slot probability models configuration
 * Data source: .claude/knowledge-base/slot-models.md
 */

export type SlotOutcomeConfig = {
  key: string; // Win multiplier as string (for display)
  p: number; // Probability (0 < p <= 1)
  multiplier: number; // Win multiplier as number (for calculations)
};

export type SlotModelConfig = {
  name: string; // Model identifier
  outcomes: SlotOutcomeConfig[];
};

export type SlotModelsConfig = SlotModelConfig[];

/**
 * Slot probability models
 * Each model's probabilities must sum to 1.0 within tolerance
 */
const slotModels: SlotModelsConfig = [
  {
    name: 'low',
    outcomes: [
      { key: '0.00', p: 0.715, multiplier: 0.0 },
      { key: '0.50', p: 0.14, multiplier: 0.5 },
      { key: '1.00', p: 0.08, multiplier: 1.0 },
      { key: '2.00', p: 0.04, multiplier: 2.0 },
      { key: '5.00', p: 0.015, multiplier: 5.0 },
      { key: '10.00', p: 0.006, multiplier: 10.0 },
      { key: '20.00', p: 0.0025, multiplier: 20.0 },
      { key: '50.00', p: 0.001, multiplier: 50.0 },
      { key: '100.00', p: 0.0004, multiplier: 100.0 },
      { key: '500.00', p: 0.0001, multiplier: 500.0 },
    ],
  },
  {
    name: 'medium',
    outcomes: [
      { key: '0.00', p: 0.78, multiplier: 0.0 },
      { key: '0.50', p: 0.1, multiplier: 0.5 },
      { key: '1.50', p: 0.06, multiplier: 1.5 },
      { key: '3.00', p: 0.035, multiplier: 3.0 },
      { key: '8.00', p: 0.015, multiplier: 8.0 },
      { key: '15.00', p: 0.006, multiplier: 15.0 },
      { key: '35.00', p: 0.0025, multiplier: 35.0 },
      { key: '100.00', p: 0.001, multiplier: 100.0 },
      { key: '300.00', p: 0.0004, multiplier: 300.0 },
      { key: '1000.00', p: 0.00008, multiplier: 1000.0 },
      { key: '2500.00', p: 0.00002, multiplier: 2500.0 },
    ],
  },
  {
    name: 'high',
    outcomes: [
      { key: '0.00', p: 0.855, multiplier: 0.0 },
      { key: '0.20', p: 0.08, multiplier: 0.2 },
      { key: '1.00', p: 0.04, multiplier: 1.0 },
      { key: '4.00', p: 0.015, multiplier: 4.0 },
      { key: '15.00', p: 0.006, multiplier: 15.0 },
      { key: '50.00', p: 0.002, multiplier: 50.0 },
      { key: '200.00', p: 0.001, multiplier: 200.0 },
      { key: '1000.00', p: 0.0005, multiplier: 1000.0 },
      { key: '3000.00', p: 0.0002, multiplier: 3000.0 },
      { key: '5000.00', p: 0.00008, multiplier: 5000.0 },
      { key: '10000.00', p: 0.00022, multiplier: 10000.0 },
    ],
  },
];

export default slotModels;
