import React, { createContext, useState } from 'react';

// Create a context for authentication
const AuthContext = createContext();

// Create an AuthProvider component
const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || null);

  // Function to login the user
  const login = (token, user) => {
    setAuthToken(token);
    setUsername(user);
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', user);
  };

  // Function to logout the user
  const logout = () => {
    setAuthToken(null);
    setUsername(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
  };

  // Pass authToken, username, login, and logout to context consumers
  return (
    <AuthContext.Provider value={{ authToken, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the AuthContext and AuthProvider
export { AuthContext, AuthProvider };
