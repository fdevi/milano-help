export const ADMIN_USER_ID = "51aeacbc-1497-440c-8edb-23845ce077d3";

export const ADMIN_PROFILE = {
  user_id: ADMIN_USER_ID,
  nome: "Admin",
  cognome: "MilanoHelp",
  avatar_url: "/logo/logo-192.png",
  quartiere: "Milano",
  nome_attivita: null as string | null,
};

export const isAdminUser = (userId: string | null | undefined): boolean =>
  userId === ADMIN_USER_ID;

/**
 * Returns admin profile if userId matches, otherwise returns the provided profile.
 */
export const getDisplayProfile = (userId: string, profile: any) =>
  isAdminUser(userId) ? { ...ADMIN_PROFILE } : profile;
