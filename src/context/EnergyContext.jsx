import React, { createContext } from 'react';
const EnergyContext = createContext({});
export const EnergyProvider = ({ children }) => React.createElement(EnergyContext.Provider, { value: {} }, children);
