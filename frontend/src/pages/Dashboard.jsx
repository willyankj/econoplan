import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { AppBar, Toolbar, Typography, Button, Container, Box, List, ListItem, ListItemText, Alert } from '@mui/material';

const Dashboard = () => {
    const { logout, user } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const response = await axiosClient.get('/tenants/');
                setTenants(response.data);
            } catch (err) {
                setError('Failed to fetch tenants.');
                console.error('Fetch tenants error:', err);
            }
        };

        fetchTenants();
    }, []);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        EconoPlan Dashboard
                    </Typography>
                    {user && <Typography sx={{ mr: 2 }}>Welcome, {user.email}</Typography>}
                    <Button color="inherit" onClick={logout}>Logout</Button>
                </Toolbar>
            </AppBar>
            <Container sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Your Tenants
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {tenants.length > 0 ? (
                    <List>
                        {tenants.map((tenant) => (
                            <ListItem key={tenant.id} disablePadding>
                                <ListItemText primary={tenant.name} />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography>No tenants found.</Typography>
                )}
            </Container>
        </Box>
    );
};

export default Dashboard;
