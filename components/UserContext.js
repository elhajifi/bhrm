"use client";
import { createContext, useContext } from "react";

const UserContext = createContext(null);

export function UserProvider({ user, children }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** The logged-in user ({ id, role, name, first_name, last_name, email }). */
export function useUser() {
  return useContext(UserContext);
}
