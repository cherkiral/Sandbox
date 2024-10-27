import React from 'react';
import { Link } from 'react-router-dom';
import '../index.css';

const Home = () => {
  return (
    <div className="auth-container">
      <h1>Welcome to the App</h1>
      <p>Please <Link to="/login">Login</Link> or <Link to="/register">Register</Link>.</p>
    </div>
  );
};

export default Home;
