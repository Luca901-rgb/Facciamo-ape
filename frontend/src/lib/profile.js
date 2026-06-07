export function isProfileComplete(user) {
  const hasPhoto = Boolean(user?.photo_path || user?.picture);
  return Boolean(
    hasPhoto &&
    user?.age &&
    user?.city &&
    user?.time_slot &&
    user?.drink &&
    user?.bio
  );
}

export const DRINKS = ["Birra", "Vino", "Cocktail", "Analcolico"];
export const TIME_SLOTS = ["18-19", "19-20", "20-21", "21-22"];
