const API = {
    endpoint: "/auth/",
    // ADD HERE ALL THE OTHER API FUNCTIONS
    register: async (user) => {
        return await API.makePostRequest(`${API.endpoint}register`, user);
    },
    checkAuthOptions: async (user) => {
        return await API.makePostRequest(`${API.endpoint}auth-options`, user);
    },
    login: async (user) => {
        return await API.makePostRequest(`${API.endpoint}login`, user);
    },
    loginFromGoogle: async (data) => {
        return await API.makePostRequest(`${API.endpoint}login-google`, data);
    },
    makePostRequest: async (url, data) => {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },
    webAuthn: {
        loginOptions: async (email) => {
            return await API.makePostRequest(API.endpoint + "webauth-login-options", { email });
        },
        loginVerification: async (email, data) => {
            return await API.makePostRequest(API.endpoint + "webauth-login-verification", {
                email,
                data
            });                       
        },
        registrationOptions: async (email) => {
            return await API.makePostRequest(API.endpoint + "webauth-registration-options", { email });           
        },
        registrationVerification: async (email, data) => {
            return await API.makePostRequest(API.endpoint + "webauth-registration-verification", {
                email,
                data
            });                       
        }
    },
}

export default API;
