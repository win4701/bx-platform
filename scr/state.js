import { createContext, useContext, useState } from "react";

const Ctx = createContext();
export const useApp = ()=>useContext(Ctx);

export function Provider({children}){
  const [state,setState] = useState(null);
  return <Ctx.Provider value={{state,setState}}>{children}</Ctx.Provider>;
}
