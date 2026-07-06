export function canAccess(feature, tier) {
  const access = {
    free: {
      export: false,
      publish: false,
      schedule: false,
      upload: false,
    },
    basic: {
      export: true,
      publish: true,
      schedule: true,
      upload: true,
    },
    pro: {
      export: true,
      publish: true,
      schedule: true,
      upload: true,
      aiMedia: true,
    },
    elite: {
      export: true,
      publish: true,
      schedule: true,
      upload: true,
      aiMedia: true,
      automation: true,
    },
  };

  return access[tier]?.[feature] ?? false;
}