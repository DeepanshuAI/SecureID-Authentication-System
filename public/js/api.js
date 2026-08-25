const TEST_MODE = true;

const api = {
    async post(endpoint, data, token = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        try {
            const response = await fetch(`/api${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    },
    
    async get(endpoint, token = null) {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        try {
            const response = await fetch(`/api${endpoint}`, {
                method: 'GET',
                headers
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
};

const UI = {
    showNotification(message, type = 'success') {
        const el = document.getElementById('notification');
        if (!el) return;
        el.textContent = message;
        el.className = `show ${type}`;
        setTimeout(() => { el.className = ''; }, 3000);
    }
};
