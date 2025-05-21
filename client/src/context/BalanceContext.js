import React, { createContext, useState, useContext } from "react";

const BalanceContext = createContext();

export function BalanceProvider({ children }) {
  const [balance, setBalance] = useState(0);

  return (
    <BalanceContext.Provider value={{ balance, setBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
}
