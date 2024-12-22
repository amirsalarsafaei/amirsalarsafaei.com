import { useState, useEffect } from 'react';

export const useAuth = () => {
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('AUTH');
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem('AUTH', token);
        } else {
            localStorage.removeItem('AUTH');
        }
    }, [token]);

    return {
        token,
        setToken,
        isAuthenticated: !!token
    };
};
