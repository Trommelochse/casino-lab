/**
 * Slot probability models configuration
 * Data source: .claude/knowledge-base/slot-models.md
 */

export type SlotOutcomeConfig = {
  key: string; // Win multiplier as string
  p: number; // Probability (0 < p <= 1)
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
      { key: '0.00', p: 0.715 },
      { key: '0.50', p: 0.14 },
      { key: '1.00', p: 0.08 },
      { key: '2.00', p: 0.04 },
      { key: '5.00', p: 0.015 },
      { key: '10.00', p: 0.006 },
      { key: '20.00', p: 0.0025 },
      { key: '50.00', p: 0.001 },
      { key: '100.00', p: 0.0004 },
      { key: '500.00', p: 0.0001 }, // Adjusted to make sum = 1.0
    ],
  },
  {
    name: 'medium',
    outcomes: [
      { key: '0.00', p: 0.78 },
      { key: '0.50', p: 0.1 },
      { key: '1.50', p: 0.06 },
      { key: '3.00', p: 0.035 },
      { key: '8.00', p: 0.015 },
      { key: '15.00', p: 0.006 },
      { key: '35.00', p: 0.0025 },
      { key: '100.00', p: 0.001 },
      { key: '300.00', p: 0.0004 },
      { key: '1000.00', p: 0.00008 },
      { key: '2500.00', p: 0.00002 }, // Adjusted to make sum = 1.0
    ],
  },
  {
    name: 'high',
    outcomes: [
      { key: '0.00', p: 0.855 },
      { key: '0.20', p: 0.08 },
      { key: '1.00', p: 0.04 },
      { key: '4.00', p: 0.015 },
      { key: '15.00', p: 0.006 },
      { key: '50.00', p: 0.002 },
      { key: '200.00', p: 0.001 },
      { key: '1000.00', p: 0.0005 },
      { key: '3000.00', p: 0.0002 },
      { key: '5000.00', p: 0.00008 },
      { key: '10000.00', p: 0.00022 }, // Adjusted to make sum = 1.0
    ],
  },
];

export default slotModels;
