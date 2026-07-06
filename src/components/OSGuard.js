import { loadCreatorMemory } from "../core/memory/creatorMemory.jsS";
import { Navigate } from "react-router-dom";

export default function OSGuard({ children }) {
  const creator = loadCreatorMemory();
  if (!creator) return <Navigate to="/setup" replace />;
  return children;
}
