const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUsername = (username) => {
    if (!username) {
        return 'Username is missing.';
    }
    if (username.length < 3) {
        return 'Username must be at least 3 characters long!';
    }
    if (username.length > 20) {
        return 'Username cannot be more than 20 characters!';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return 'Username can only contain letters, numbers, and underscores.';
    }
    return null;
};

export const validateEmail = (email) => {
    if (!email) {
        return 'Email is required.';
    }
    if (!EMAIL_REGEX.test(email)) {
        return 'Please enter a valid email address.';
    }
    return null;
};

export const validatePassword = (password) => {
    if (!password) {
        return 'Password is required.';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    if (!/[a-zA-Z]/.test(password)) {
        return 'Password must contain at least one letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number.';
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        return 'Password must contain at least one special character.';
    }
    return null; // No error
};