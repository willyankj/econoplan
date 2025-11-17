import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box, Alert, Link } from '@mui/material';

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== password2) {
            setError('Passwords do not match.');
            return;
        }

        try {
            await register({ email, password, password2 });
            navigate('/');
        } catch (err) {
            setError('Failed to register. An account with this email may already exist.');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Sign up
                </Typography>
                {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                     <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password2"
                        label="Confirm Password"
                        type="password"
                        id="password2"
                        autoComplete="new-password"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Sign Up
                    </Button>
                     <Box textAlign="center">
                      <Link component={RouterLink} to="/login" variant="body2">
                          {"Already have an account? Sign In"}
                      </Link>
                    </Box>
                </Box>
            </Box>
        </Container>
    );
};

export default Register;
