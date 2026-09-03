let isConnected = false;

export const dbState = {
  isConnected: (): boolean => isConnected,
  setConnected: (val: boolean): void => {
    isConnected = val;
  },
};
