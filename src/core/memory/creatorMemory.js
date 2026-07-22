const CREATOR_KEY = "astramind_creator_v1";

export const saveCreatorMemory = (creator) => {
  localStorage.setItem(CREATOR_KEY, JSON.stringify({
    ...creator,
    updatedAt: new Date().toISOString()
  }));
};

export const loadCreatorMemory = () => {
  const raw = localStorage.getItem(CREATOR_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearCreatorMemory = () => {
  localStorage.removeItem(CREATOR_KEY);
};
