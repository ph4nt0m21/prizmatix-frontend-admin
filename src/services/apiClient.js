import axios from "axios";
import Cookies from "js-cookie";

const BASEURL = process.env.REACT_APP_API_URL;

console.log("API Base URL:", BASEURL); // Add this for debugging

const apiClient = axios.create({
  baseURL: BASEURL,
});

// Request Interceptor: Attach Token to Requests
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Adding token to request:", config.url);
    } else {
      console.warn("No token found for request:", config.url);
    }
    
    if (config.responseType !== "blob" && config.responseType !== "arraybuffer") {
      config.headers["Accept"] = "application/json";
    }

    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    } else if (config.data) {
      config.headers["Content-Type"] = "application/json";
      // Log request body for debugging
      console.log(`Request to ${config.url}:`, config.data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Unauthorized Errors
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response for debugging
    console.log(`Response from ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    // Only redirect on 401 (invalid/expired token). 403 is left to callers so they can show
    // context-specific messages (e.g. "Super admin access required" on payout endpoints).
    if (error.response && error.response.status === 401) {
      Cookies.remove("token");
      localStorage.removeItem("userData");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;