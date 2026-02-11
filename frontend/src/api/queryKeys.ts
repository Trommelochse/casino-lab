export const casinoKeys = {
  all: ['casino'] as const,
  state: () => [...casinoKeys.all, 'state'] as const,
  players: () => [...casinoKeys.all, 'players'] as const,
}
