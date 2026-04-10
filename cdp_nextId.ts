export function cdp_nextId(state: { nextId: number }): number {
  const id = state.nextId;
  state.nextId += 1;
  return id;
}
