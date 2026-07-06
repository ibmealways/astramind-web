import { createContext, useContext, useState } from "react";
import { addMemory, recallMemory } from "../core/memory/memoryEngine.js";

const MemoryContext = createContext();

export function MemoryProvider({ children }) {
  const [memory, setMemory] = useState(recallMemory());

  const remember = (entry) => {
    addMemory(entry);
    setMemory(recallMemory());
  };

  return (
    <MemoryContext.Provider value={{ memory, remember }}>
      {children}
    </MemoryContext.Provider>
  );
}

export const useMemory = () => useContext(MemoryContext);
