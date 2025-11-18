import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { Button, Container, Typography } from '@mui/material';

const DashboardPage = () => {
  const { user, logoutUser } = useContext(AuthContext);

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      {user && <Typography variant="h6">Welcome, {user.email}!</Typography>}
      <Button variant="contained" color="secondary" onClick={logoutUser}>
        Logout
      </Button>
    </Container>
  );
};

export default DashboardPage;
